import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { requireAuth, signToken, type AuthPayload } from "../middlewares/auth.js";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildBusiness(
  store: Record<string, unknown>,
  user: { email?: string; user_metadata?: Record<string, unknown> } | null
) {
  const createdAt = (store.created_at as string) ?? new Date().toISOString();
  // Compute 15-day trial end from creation date (graceful — no extra DB column needed)
  const storedTrial = store.trial_ends_at as string | null | undefined;
  const trialEndsAt = storedTrial ??
    new Date(new Date(createdAt).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id:          store.id as string,
    name:        store.business_name as string,
    type:        store.category as string,
    plan:        (store.subscription_plan as string) ?? "starter",
    email:       user?.email ?? "",
    slug:        slugify((store.business_name as string) ?? "store"),
    phone:       (user?.user_metadata?.phone   as string) ?? "",
    address:     (user?.user_metadata?.address as string) ?? "",
    logoUrl:     (user?.user_metadata?.logoUrl as string) ?? "",
    active:      store.active as boolean,
    createdAt,
    trialEndsAt,
  };
}

// ─── Register ─────────────────────────────────────────────────────────────────
router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const { name, type, email, phone, password, address } = req.body as {
    name: string; type: string; email: string;
    phone: string; password: string; address?: string;
  };

  if (!name || !type || !email || !phone || !password) {
    res.status(400).json({ error: "Tous les champs sont obligatoires" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
    return;
  }

  // 1. Create Supabase Auth user (confirmed immediately — no email verification needed)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { phone, address: address ?? "", logoUrl: "" },
  });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
      res.status(400).json({ error: "Cet email est déjà utilisé" });
    } else {
      res.status(400).json({ error: msg || "Erreur lors de la création du compte" });
    }
    return;
  }

  const userId  = authData.user.id;
  const storeId = randomUUID();

  // 2. Insert into stores
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      id: storeId,
      owner_id: userId,
      business_name: name,
      category: type,
      subscription_plan: "starter",
      active: true,
      trial_ends_at: trialEndsAt,
      payment_config: { provider: null, public_key: null, secret_key: null, is_enabled: false, payout_details: null },
    })
    .select()
    .single();

  if (storeError || !store) {
    // Roll back the auth user so the account isn't orphaned
    await supabase.auth.admin.deleteUser(userId);
    res.status(500).json({ error: storeError?.message ?? "Erreur lors de la création du magasin" });
    return;
  }

  const business = buildBusiness(store as Record<string, unknown>, authData.user);
  const payload: AuthPayload = { businessId: store.id as string, email, slug: business.slug };

  res.status(201).json({ token: signToken(payload), business });
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis" });
    return;
  }

  // 1. Supabase authentication
  const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({ email, password });
  if (sbError || !sbData.user) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  // 2. Fetch the store linked to this user
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", sbData.user.id)
    .maybeSingle();

  if (storeError || !store) {
    res.status(401).json({ error: "Aucun magasin associé à ce compte" });
    return;
  }

  const business = buildBusiness(store as Record<string, unknown>, sbData.user);
  const payload: AuthPayload = { businessId: store.id as string, email, slug: business.slug };

  res.status(200).json({ token: signToken(payload), business });
});

// ─── Me ───────────────────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const auth = (req as Request & { auth: AuthPayload }).auth;

  const { data: store, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", auth.businessId)
    .maybeSingle();

  if (error || !store) {
    res.status(404).json({ error: "Magasin introuvable" });
    return;
  }

  // Fetch user metadata for phone/address/logoUrl
  const { data: userData } = await supabase.auth.admin.getUserById(store.owner_id as string);
  const business = buildBusiness(store as Record<string, unknown>, userData?.user ?? null);

  res.json(business);
});

export default router;
