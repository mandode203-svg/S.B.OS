import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

// ─── Field mapping helpers ────────────────────────────────────────────────────
// Supabase columns:  store_id | is_available | stock | image_url | tiktok_code
// Frontend fields:   (auth)   | available    | stockQty | photoUrl | tiktokCode

function toFrontend(row: Record<string, unknown>) {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description ?? null,
    price:       row.price,
    category:    row.category,
    available:   row.is_available,
    stockQty:    row.stock,
    photoUrl:    row.image_url ?? null,
    tiktokCode:  row.tiktok_code ?? null,
  };
}

function toSupabase(body: Record<string, unknown>, storeId?: string) {
  const row: Record<string, unknown> = {};
  if (storeId                   !== undefined) row.store_id     = storeId;
  if (body.name                 !== undefined) row.name         = body.name;
  if (body.description          !== undefined) row.description  = body.description ?? null;
  if (body.price                !== undefined) row.price        = Number(body.price);
  if (body.category             !== undefined) row.category     = body.category;
  if (body.available            !== undefined) row.is_available = body.available;
  if (body.stockQty             !== undefined) row.stock        = Number(body.stockQty);
  if (body.photoUrl             !== undefined) row.image_url    = body.photoUrl ?? null;
  if (body.tiktokCode           !== undefined) row.tiktok_code  = (body.tiktokCode as string)?.toUpperCase().trim() || null;
  return row;
}

// ─── GET /products ────────────────────────────────────────────────────────────
router.get("/products", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { category, available } = req.query as { category?: string; available?: string };

  let query = supabase
    .from("products")
    .select("*")
    .eq("store_id", businessId);

  if (category)             query = query.eq("category", category);
  if (available !== undefined) query = query.eq("is_available", available === "true");

  const { data, error } = await query.order("category").order("name");

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json((data ?? []).map(r => toFrontend(r as Record<string, unknown>)));
});

// ─── POST /products ───────────────────────────────────────────────────────────
router.post("/products", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const body = req.body as Record<string, unknown>;

  if (!body.name || body.price == null || !body.category) {
    res.status(400).json({ error: "Nom, prix et catégorie sont obligatoires" });
    return;
  }

  // ── Trial limit: max 5 products ──────────────────────────────────────────────
  const { data: storeData } = await supabase
    .from("stores")
    .select("trial_ends_at, subscription_plan")
    .eq("id", businessId)
    .maybeSingle();

  const trialEndsAt = (storeData?.trial_ends_at as string | null) ?? null;
  const isInTrial = trialEndsAt ? new Date() < new Date(trialEndsAt) : false;

  if (isInTrial) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", businessId);

    if ((count ?? 0) >= 5) {
      res.status(403).json({
        error: "TRIAL_PRODUCT_LIMIT",
        message: "Mise à niveau requise ! Vous avez atteint la limite de 5 produits de votre formule d'essai gratuit. Choisissez un abonnement pour ajouter des produits illimités.",
      });
      return;
    }
  }

  const payload = {
    id: randomUUID(),
    ...toSupabase(body, businessId),
    is_available: body.available !== false,
    stock:        Number(body.stockQty ?? 0),
  };

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(toFrontend(data as Record<string, unknown>));
});

// ─── PUT /products/:id ────────────────────────────────────────────────────────
router.put("/products/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  // Verify ownership
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("id", rawId)
    .eq("store_id", businessId)
    .maybeSingle();

  if (!existing) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }

  const updates = toSupabase(req.body as Record<string, unknown>);

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", rawId)
    .eq("store_id", businessId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(toFrontend(data as Record<string, unknown>));
});

// ─── DELETE /products/:id ─────────────────────────────────────────────────────
router.delete("/products/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  // Verify ownership before deleting
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("id", rawId)
    .eq("store_id", businessId)
    .maybeSingle();

  if (!existing) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", rawId)
    .eq("store_id", businessId);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.sendStatus(204);
});

export default router;
