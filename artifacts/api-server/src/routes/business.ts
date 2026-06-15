import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// PUT /business — update business info (called from Parametres.tsx)
router.put("/business", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const auth = (req as AuthReq).auth;
  const { name, type, phone, address, logoUrl } = req.body as {
    name?: string; type?: string; phone?: string; address?: string | null; logoUrl?: string | null;
  };

  // Build stores update payload
  const storeUpdates: Record<string, unknown> = {};
  if (name  != null) storeUpdates["business_name"] = name;
  if (type  != null) storeUpdates["category"]      = type;

  // Update stores table
  if (Object.keys(storeUpdates).length > 0) {
    const { error } = await supabase
      .from("stores")
      .update(storeUpdates)
      .eq("id", auth.businessId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  // Update phone/address/logoUrl in Supabase Auth user metadata
  const { data: store } = await supabase
    .from("stores")
    .select("owner_id, business_name, category, subscription_plan, active, created_at")
    .eq("id", auth.businessId)
    .single();

  if (!store) {
    res.status(404).json({ error: "Magasin introuvable" });
    return;
  }

  // Fetch current metadata then merge
  const { data: userData } = await supabase.auth.admin.getUserById(store.owner_id as string);
  const currentMeta = (userData?.user?.user_metadata as Record<string, unknown>) ?? {};

  const newMeta: Record<string, unknown> = { ...currentMeta };
  if (phone   !== undefined) newMeta["phone"]   = phone;
  if (address !== undefined) newMeta["address"] = address;
  if (logoUrl !== undefined) newMeta["logoUrl"] = logoUrl;

  await supabase.auth.admin.updateUserById(store.owner_id as string, {
    user_metadata: newMeta,
  });

  // Return the updated business shape
  res.json({
    id:        auth.businessId,
    name:      (storeUpdates["business_name"] ?? store.business_name) as string,
    type:      (storeUpdates["category"]      ?? store.category)      as string,
    plan:      (store.subscription_plan as string) ?? "starter",
    email:     userData?.user?.email ?? "",
    slug:      slugify(((storeUpdates["business_name"] ?? store.business_name) as string) ?? "store"),
    phone:     (newMeta["phone"]   as string) ?? "",
    address:   (newMeta["address"] as string) ?? "",
    logoUrl:   (newMeta["logoUrl"] as string) ?? "",
    active:    store.active as boolean,
    createdAt: (store.created_at as string) ?? new Date().toISOString(),
    trialEndsAt: new Date(
      new Date((store.created_at as string) ?? new Date().toISOString()).getTime() + 15 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });
});

// POST /business/logo — upload logo to Supabase Storage, save URL to user_metadata
router.post("/business/logo", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const auth = (req as AuthReq).auth;
  const { dataBase64, mimeType, fileName } = req.body as {
    dataBase64?: string;
    mimeType?: string;
    fileName?: string;
  };

  if (!dataBase64 || !mimeType || !fileName) {
    res.status(400).json({ error: "dataBase64, mimeType et fileName sont requis" });
    return;
  }

  // Decode base64 to buffer
  const fileBuffer = Buffer.from(dataBase64, "base64");
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const storagePath = `${auth.businessId}/logo.${ext}`;

  // Upload to Supabase Storage bucket "logos"
  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });

  if (uploadError) {
    // If bucket doesn't exist yet, return URL fallback with meaningful error
    res.status(500).json({ error: `Upload échoué: ${uploadError.message}` });
    return;
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("logos").getPublicUrl(storagePath);
  const logoUrl = urlData.publicUrl;

  // Save to user_metadata (consistent with existing pattern)
  const { data: store } = await supabase
    .from("stores")
    .select("owner_id")
    .eq("id", auth.businessId)
    .single();

  if (store) {
    const { data: userData } = await supabase.auth.admin.getUserById(store.owner_id as string);
    const currentMeta = (userData?.user?.user_metadata as Record<string, unknown>) ?? {};
    await supabase.auth.admin.updateUserById(store.owner_id as string, {
      user_metadata: { ...currentMeta, logoUrl },
    });
  }

  res.json({ logoUrl });
});

// PUT /business/plan — update subscription plan (admin / testing)
router.put("/business/plan", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const auth = (req as AuthReq).auth;
  const { plan } = req.body as { plan?: string };

  const allowed = ["starter", "business", "pro"];
  if (!plan || !allowed.includes(plan)) {
    res.status(400).json({ error: `Plan invalide. Options: ${allowed.join(", ")}` });
    return;
  }

  const { error } = await supabase
    .from("stores")
    .update({ subscription_plan: plan })
    .eq("id", auth.businessId);

  if (error) { res.status(500).json({ error: error.message }); return; }

  res.json({ success: true, plan });
});

// GET /business/:slug — public route used by the customer order page
router.get("/business/:slug", async (req: Request, res: Response): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  // Fetch all stores and find by derived slug (no slug column in stores table)
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, business_name, category, subscription_plan, active");

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const store = (stores ?? []).find(
    (s) => slugify((s.business_name as string) ?? "") === slug
  );

  if (!store) {
    res.status(404).json({ error: "Établissement introuvable" });
    return;
  }

  // Fetch available products from Supabase
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, category, description, image_url, is_available, stock")
    .eq("store_id", store.id)
    .eq("is_available", true);

  res.json({
    id:       store.id,
    name:     store.business_name,
    type:     store.category,
    plan:     store.subscription_plan ?? "starter",
    slug,
    active:   store.active,
    products: (products ?? []).map(p => ({
      id:          p.id,
      name:        p.name,
      price:       p.price,
      category:    p.category,
      description: p.description ?? "",
      imageUrl:    p.image_url ?? "",
      available:   p.is_available,
      stock:       p.stock,
    })),
  });
});

// GET /storefront/:storeId — public route used by /store/:storeId page (by UUID, faster than slug)
router.get("/storefront/:storeId", async (req: Request, res: Response): Promise<void> => {
  const storeId = Array.isArray(req.params.storeId) ? req.params.storeId[0] : req.params.storeId;

  const { data: store, error } = await supabase
    .from("stores")
    .select("id, business_name, category, subscription_plan, active")
    .eq("id", storeId)
    .maybeSingle();

  if (error || !store) {
    res.status(404).json({ error: "Établissement introuvable" });
    return;
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, category, description, image_url, is_available, stock")
    .eq("store_id", storeId)
    .eq("is_available", true)
    .order("category")
    .order("name");

  res.json({
    id:       store.id,
    name:     store.business_name,
    type:     store.category,
    plan:     store.subscription_plan ?? "starter",
    active:   store.active,
    products: (products ?? []).map(p => ({
      id:          p.id,
      name:        p.name,
      price:       p.price,
      category:    p.category,
      description: p.description ?? null,
      photoUrl:    p.image_url ?? null,
      available:   p.is_available,
      stock:       p.stock,
    })),
  });
});

export default router;
