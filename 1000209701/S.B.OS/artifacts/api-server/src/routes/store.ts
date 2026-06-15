
import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";
import { supabase } from "../lib/supabase.js";

const router: IRouter = Router();

type AuthReq = Request & { auth: AuthPayload };

// GET /store/config — fetch WhatsApp + payment + TikTok config for current store
router.get("/store/config", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;

  const { data, error } = await supabase
    .from("stores")
    .select("id, business_name, category, subscription_plan, whatsapp_instance_id, whatsapp_token, payment_config, active, tiktok_username, social_links")
    .eq("id", businessId)
    .maybeSingle();

  if (error || !data) {
    res.status(404).json({ error: "Store not found" });
    return;
  }

  res.json(data);
});

// PUT /store/whatsapp — update WhatsApp credentials
router.put("/store/whatsapp", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { whatsapp_instance_id, whatsapp_token } = req.body as {
    whatsapp_instance_id?: string;
    whatsapp_token?: string;
  };

  const { data, error } = await supabase
    .from("stores")
    .update({
      whatsapp_instance_id: whatsapp_instance_id ?? null,
      whatsapp_token: whatsapp_token ?? null,
    })
    .eq("id", businessId)
    .select("id, whatsapp_instance_id, whatsapp_token")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ success: true, data });
});

// PUT /store/payment — update payment config (kept for backward compat — no merchant keys stored)
router.put("/store/payment", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { instructions } = req.body as { instructions?: string | null };

  // Fetch current config to preserve payout_details
  const { data: current } = await supabase
    .from("stores")
    .select("payment_config")
    .eq("id", businessId)
    .maybeSingle();

  const existing = (current?.payment_config as Record<string, unknown>) ?? {};

  const paymentConfig = {
    ...existing,
    provider:     null,
    public_key:   null,
    secret_key:   null,
    is_enabled:   false,
    instructions: instructions ?? null,
  };

  const { data, error } = await supabase
    .from("stores")
    .update({ payment_config: paymentConfig })
    .eq("id", businessId)
    .select("id, payment_config")
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true, data });
});

// PUT /store/payout — update payout (withdrawal) details
router.put("/store/payout", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { payout_number, payout_method } = req.body as {
    payout_number?: string;
    payout_method?: string;
  };

  // Fetch current config
  const { data: current } = await supabase
    .from("stores")
    .select("payment_config")
    .eq("id", businessId)
    .maybeSingle();

  const existing = (current?.payment_config as Record<string, unknown>) ?? {};

  const paymentConfig = {
    ...existing,
    payout_details: {
      phone:  payout_number ?? "",
      method: payout_method ?? "",
    },
  };

  const { data, error } = await supabase
    .from("stores")
    .update({ payment_config: paymentConfig })
    .eq("id", businessId)
    .select("id, payment_config")
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true, data });
});

// PUT /store/tiktok — update TikTok username
router.put("/store/tiktok", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { tiktok_username } = req.body as { tiktok_username?: string | null };

  const { data, error } = await supabase
    .from("stores")
    .update({ tiktok_username: tiktok_username?.trim() || null })
    .eq("id", businessId)
    .select("id, tiktok_username")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ success: true, data });
});

// POST /ai/chat — public AI chat endpoint (customer-facing, no auth required)
router.post("/ai/chat", async (req: Request, res: Response): Promise<void> => {
  const { storeId, customerPhone, message } = req.body as {
    storeId?: string;
    customerPhone?: string;
    message?: string;
  };

  if (!storeId || !customerPhone || !message) {
    res.status(400).json({ error: "storeId, customerPhone et message sont requis" });
    return;
  }

  // Verify the store exists and is active
  const { data: store } = await supabase
    .from("stores")
    .select("id, active")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) {
    res.status(404).json({ error: "Établissement introuvable" });
    return;
  }

  try {
    const { processMessage } = await import("../services/aiService.js");
    const result = await processMessage(storeId, customerPhone, message);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    res.status(500).json({ error: msg });
  }
});

// POST /ai/message — process a message through the AI service
router.post("/ai/message", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { customer_phone, message } = req.body as {
    customer_phone?: string;
    message?: string;
  };

  if (!customer_phone || !message) {
    res.status(400).json({ error: "customer_phone and message are required" });
    return;
  }

  try {
    const { processMessage } = await import("../services/aiService.js");
    const result = await processMessage(businessId, customer_phone, message);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    res.status(500).json({ error: msg });
  }
});

// GET /store/communication-logs/failed-count — count of failed notifications in last 24h
router.get("/store/communication-logs/failed-count", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("communication_logs")
    .select("id", { count: "exact", head: true })
    .eq("store_id", businessId)
    .eq("status", "failed")
    .gte("created_at", since);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ count: count ?? 0 });
});

// GET /store/communication-logs — paginated logs for current store
router.get("/store/communication-logs", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
  const offset = (page - 1) * limit;
  const channel = req.query.channel as string | undefined;
  const status = req.query.status as string | undefined;

  let query = supabase
    .from("communication_logs")
    .select("id, order_id, channel, recipient, message, status, created_at", { count: "exact" })
    .eq("store_id", businessId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (channel && channel !== "all") query = query.eq("channel", channel);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ logs: data ?? [], total: count ?? 0, page, limit });
});

// PUT /store/social — update social network links
router.put("/store/social", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { facebook, instagram, messenger, whatsapp_business } = req.body as {
    facebook?: string | null;
    instagram?: string | null;
    messenger?: string | null;
    whatsapp_business?: string | null;
  };

  const socialLinks = {
    facebook:          facebook ?? null,
    instagram:         instagram ?? null,
    messenger:         messenger ?? null,
    whatsapp_business: whatsapp_business ?? null,
  };

  const { data, error } = await supabase
    .from("stores")
    .update({ social_links: socialLinks })
    .eq("id", businessId)
    .select("id, social_links")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ success: true, data });
});

export default router;
