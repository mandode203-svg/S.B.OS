import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

router.get("/staff", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;

  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("store_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

router.post("/staff", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { name, email, role } = req.body as { name: string; email: string; role: string };

  if (!name || !email || !role) {
    res.status(400).json({ error: "name, email et role sont obligatoires" });
    return;
  }

  const { data, error } = await supabase
    .from("staff")
    .insert({
      id: randomUUID(),
      store_id: businessId,
      name,
      email,
      role,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

router.delete("/staff/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const { data: existing } = await supabase
    .from("staff")
    .select("id")
    .eq("id", rawId)
    .eq("store_id", businessId)
    .maybeSingle();

  if (!existing) {
    res.status(404).json({ error: "Membre du personnel introuvable" });
    return;
  }

  const { error } = await supabase
    .from("staff")
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
