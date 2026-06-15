import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

type SupabaseOrder = {
  id: string;
  store_id: string;
  order_status: string;
  total_amount: number;
  items: Array<{ name: string; qty: number; price: number; product_id?: string }>;
  created_at: string;
  customer_name: string;
  customer_phone: string;
};

type SupabaseClient = {
  id: string;
  store_id: string;
  name: string;
  phone: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
};

router.get("/reports/dashboard", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;

  const [ordersResult, clientsResult] = await Promise.all([
    supabase.from("orders").select("*").eq("store_id", businessId),
    supabase.from("clients").select("*").eq("store_id", businessId),
  ]);

  if (ordersResult.error) {
    res.status(500).json({ error: ordersResult.error.message });
    return;
  }

  const allOrders = (ordersResult.data ?? []) as SupabaseOrder[];
  const allClients = (clientsResult.data ?? []) as SupabaseClient[];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayOrders = allOrders.filter(
    o => new Date(o.created_at) >= todayStart && o.order_status !== "annulée"
  );
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  const returningClients = allClients.filter(c => (c.total_orders ?? 0) > 1).length;
  const loyaltyRate = allClients.length > 0 ? (returningClients / allClients.length) * 100 : 0;

  const recentOrders = allOrders
    .filter(o => o.order_status !== "annulée")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(o => {
      const info = (o as unknown as { delivery_info?: Record<string, unknown> }).delivery_info ?? {};
      return {
        id:         o.id,
        clientName: o.customer_name ?? "",
        total:      o.total_amount ?? 0,
        status:     o.order_status ?? "reçue",
        createdAt:  o.created_at,
        orderType:  (info["type"] as string) ?? "dine-in",
      };
    });

  res.json({
    todayRevenue,
    todayOrders: todayOrders.length,
    totalClients: allClients.length,
    loyaltyRate: Math.round(loyaltyRate * 10) / 10,
    recentOrders,
  });
});

router.get("/reports/summary", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };

  let query = supabase
    .from("orders")
    .select("*")
    .eq("store_id", businessId)
    .neq("order_status", "annulée");

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo)   query = query.lte("created_at", dateTo);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const orders = (data ?? []) as SupabaseOrder[];
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const ordersCount = orders.length;
  const avgOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;
  const period = dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : "All time";

  res.json({ totalRevenue, ordersCount, avgOrderValue, period });
});

router.get("/reports/top-products", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { dateFrom, dateTo, limit } = req.query as {
    dateFrom?: string; dateTo?: string; limit?: string;
  };

  let query = supabase
    .from("orders")
    .select("*")
    .eq("store_id", businessId)
    .neq("order_status", "annulée");

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo)   query = query.lte("created_at", dateTo);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const orders = (data ?? []) as SupabaseOrder[];
  const productMap = new Map<string, { name: string; totalSold: number; totalRevenue: number }>();

  for (const order of orders) {
    const items = order.items ?? [];
    for (const item of items) {
      const key = item.product_id ?? item.name;
      const existing = productMap.get(key);
      const qty   = item.qty ?? 1;
      const price = item.price ?? 0;
      if (existing) {
        existing.totalSold += qty;
        existing.totalRevenue += price * qty;
      } else {
        productMap.set(key, { name: item.name, totalSold: qty, totalRevenue: price * qty });
      }
    }
  }

  const limitN = limit ? parseInt(limit) : 10;
  const result = Array.from(productMap.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limitN);

  res.json(result);
});

router.get("/reports/top-clients", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { limit } = req.query as { limit?: string };
  const limitN = limit ? parseInt(limit) : 10;

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("store_id", businessId)
    .order("total_spent", { ascending: false })
    .limit(limitN);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const result = ((data ?? []) as SupabaseClient[]).map(c => ({
    clientId:    c.id,
    name:        c.name,
    phone:       c.phone,
    totalOrders: c.total_orders,
    totalSpent:  c.total_spent,
  }));

  res.json(result);
});

router.get("/reports/hourly", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };

  let query = supabase
    .from("orders")
    .select("created_at")
    .eq("store_id", businessId)
    .neq("order_status", "annulée");

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo)   query = query.lte("created_at", dateTo);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const heatmap = new Map<string, number>();
  for (const row of data ?? []) {
    const d = new Date((row as { created_at: string }).created_at);
    const key = `${d.getDay()}-${d.getHours()}`;
    heatmap.set(key, (heatmap.get(key) ?? 0) + 1);
  }

  const result = Array.from(heatmap.entries()).map(([key, count]) => {
    const [dow, hour] = key.split("-").map(Number);
    return { dayOfWeek: dow, hour, count };
  });

  res.json(result);
});

router.get("/reports/daily-revenue", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { days } = req.query as { days?: string };
  const daysN = days ? parseInt(days) : 30;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysN);

  const { data, error } = await supabase
    .from("orders")
    .select("created_at, total_amount")
    .eq("store_id", businessId)
    .neq("order_status", "annulée")
    .gte("created_at", cutoff.toISOString());

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const dailyMap = new Map<string, { revenue: number; ordersCount: number }>();
  for (const row of data ?? []) {
    const r = row as { created_at: string; total_amount: number };
    const date = new Date(r.created_at).toISOString().split("T")[0];
    const existing = dailyMap.get(date);
    if (existing) {
      existing.revenue += r.total_amount ?? 0;
      existing.ordersCount += 1;
    } else {
      dailyMap.set(date, { revenue: r.total_amount ?? 0, ordersCount: 1 });
    }
  }

  const result = [];
  for (let i = daysN - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0];
    result.push({ date, ...(dailyMap.get(date) ?? { revenue: 0, ordersCount: 0 }) });
  }

  res.json(result);
});

export default router;
