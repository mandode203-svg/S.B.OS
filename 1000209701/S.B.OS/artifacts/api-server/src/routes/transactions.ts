import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

router.get("/transactions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { method, status, dateFrom, dateTo } = req.query as {
    method?: string; status?: string; dateFrom?: string; dateTo?: string;
  };

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("store_id", businessId)
    .order("created_at", { ascending: false });

  if (method)   query = query.eq("method", method);
  if (status)   query = query.eq("status", status);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo)   query = query.lte("created_at", dateTo);

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

router.post("/transactions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { orderId, amount, method, status } = req.body as {
    orderId?: string; amount: number; method: string; status?: string;
  };

  if (amount == null || !method) {
    res.status(400).json({ error: "amount et method sont obligatoires" });
    return;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      id: randomUUID(),
      store_id: businessId,
      order_id: orderId ?? null,
      amount,
      method,
      status: status ?? "pending",
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
