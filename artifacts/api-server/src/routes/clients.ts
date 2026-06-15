import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

router.get("/clients", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { search, sortBy, sortOrder } = req.query as {
    search?: string; sortBy?: string; sortOrder?: string;
  };

  let query = supabase
    .from("clients")
    .select("*")
    .eq("store_id", businessId);

  const ascending = sortOrder !== "desc";

  if (sortBy === "total_spent" || sortBy === "totalSpent") {
    query = query.order("total_spent", { ascending });
  } else if (sortBy === "total_orders" || sortBy === "totalOrders") {
    query = query.order("total_orders", { ascending });
  } else if (sortBy === "last_order_at" || sortBy === "lastOrderAt") {
    query = query.order("last_order_at", { ascending });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  let clients = data ?? [];

  if (search) {
    const q = search.toLowerCase();
    clients = clients.filter((c: Record<string, unknown>) =>
      (c.name as string)?.toLowerCase().includes(q) ||
      (c.phone as string)?.includes(q) ||
      (c.email as string)?.toLowerCase().includes(q)
    );
  }

  res.json(clients);
});

router.get("/clients/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", rawId)
    .eq("store_id", businessId)
    .maybeSingle();

  if (error || !client) {
    res.status(404).json({ error: "Client introuvable" });
    return;
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("store_id", businessId)
    .eq("customer_phone", (client as Record<string, unknown>).phone as string)
    .order("created_at", { ascending: false });

  res.json({ ...client, orders: orders ?? [] });
});

export default router;
