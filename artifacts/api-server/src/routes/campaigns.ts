import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

router.get("/campaigns", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("store_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

router.post("/campaigns", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { name, segment, channel, message, scheduledAt } = req.body as {
    name: string; segment: string; channel: string; message: string; scheduledAt?: string;
  };

  if (!name || !segment || !channel || !message) {
    res.status(400).json({ error: "Champs obligatoires manquants" });
    return;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      id: randomUUID(),
      store_id: businessId,
      name,
      segment,
      channel,
      message,
      status: "draft",
      scheduled_at: scheduledAt ?? null,
      sent_count: 0,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

export default router;
