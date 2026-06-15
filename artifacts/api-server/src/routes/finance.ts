import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

// ─── Types internes ────────────────────────────────────────────────────────────

interface SupabaseOrder {
  id: string;
  tenant_id: string; // Mis à jour
  order_status: string;
  payment_status?: string;
  total_amount: number;
  deposit_amount?: number;
  created_at: string;
  customer_name: string;
}

interface Expense {
  id: string;
  tenant_id: string; // Mis à jour
  label: string;
  amount: number;
  category: string;
  note?: string | null;
  date: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

// ─── GET /finance/summary — Résumé global ────────────────────────────────────
router.get("/finance/summary", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)).toISOString();
  const lastMonthEnd = startOfMonth(now).toISOString();

  const [ordersRes, expensesRes, lastMonthOrdersRes] = await Promise.all([
    supabase.from("orders").select("*").eq("tenant_id", businessId).gte("created_at", monthStart).neq("order_status", "annulée"),
    supabase.from("expenses").select("*").eq("tenant_id", businessId).gte("date", monthStart.split("T")[0]!),
    supabase.from("orders").select("total_amount").eq("tenant_id", businessId).gte("created_at", lastMonthStart).lt("created_at", lastMonthEnd).neq("order_status", "annulée"),
  ]);

  const orders = (ordersRes.data ?? []) as SupabaseOrder[];
  const expenses = (expensesRes.data ?? []) as Expense[];
  const lastMonthOrders = (lastMonthOrdersRes.data ?? []) as { total_amount: number }[];

  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const profit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  const depositReceived = orders.filter(o => o.payment_status === "deposit_paid").reduce((s, o) => s + (o.deposit_amount ?? 0), 0);
  const balanceDue = orders.filter(o => o.order_status === "livrée" && o.payment_status !== "fully_paid").reduce((s, o) => s + ((o.total_amount ?? 0) - (o.deposit_amount ?? 0)), 0);

  const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const growthRate = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses) {
    expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + e.amount;
  }

  res.json({
    totalRevenue: Math.round(totalRevenue),
    totalExpenses: Math.round(totalExpenses),
    profit: Math.round(profit),
    margin: Math.round(margin * 10) / 10,
    depositReceived: Math.round(depositReceived),
    balanceDue: Math.round(balanceDue),
    ordersCount: orders.length,
    growthRate: Math.round(growthRate * 10) / 10,
    expenseByCategory,
  });
});

// ─── GET /finance/revenue/daily — Revenus jour par jour (30j) ─────────────────
router.get("/finance/revenue/daily", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const days = Math.min(Number((req.query as Record<string, string>).days ?? "30"), 90);
  const from = addDays(new Date(), -days).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select("total_amount, deposit_amount, created_at, order_status")
    .eq("tenant_id", businessId)
    .gte("created_at", from)
    .neq("order_status", "annulée")
    .order("created_at", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const byDay: Record<string, { revenue: number; orders: number; deposits: number }> = {};
  for (const o of (data ?? []) as SupabaseOrder[]) {
    const day = formatDate(new Date(o.created_at));
    if (!byDay[day]) byDay[day] = { revenue: 0, orders: 0, deposits: 0 };
    byDay[day]!.revenue += o.total_amount ?? 0;
    byDay[day]!.orders  += 1;
    byDay[day]!.deposits += o.deposit_amount ?? 0;
  }

  const result = [];
  for (let i = days; i >= 0; i--) {
    const day = formatDate(addDays(new Date(), -i));
    result.push({ date: day, revenue: Math.round(byDay[day]?.revenue ?? 0), orders: byDay[day]?.orders ?? 0, deposits: Math.round(byDay[day]?.deposits ?? 0) });
  }
  res.json(result);
});

// ─── GET /finance/expenses — Liste des dépenses ───────────────────────────────
router.get("/finance/expenses", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { from, to, category } = req.query as Record<string, string>;

  let q = supabase.from("expenses").select("*").eq("tenant_id", businessId).order("date", { ascending: false });
  if (from)     q = q.gte("date", from);
  if (to)       q = q.lte("date", to);
  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// ─── POST /finance/expenses — Ajouter une dépense ─────────────────────────────
router.post("/finance/expenses", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { label, amount, category, note, date } = req.body as {
    label: string; amount: number; category: string; note?: string; date?: string;
  };

  if (!label || !amount || !category) {
    res.status(400).json({ error: "label, amount, category sont requis" }); return;
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      id:       randomUUID(),
      tenant_id: businessId,
      label,
      amount:   Number(amount),
      category,
      note:     note ?? null,
      date:     date ?? formatDate(new Date()),
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// ─── PUT /finance/expenses/:id — Modifier une dépense ─────────────────────────
router.put("/finance/expenses/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { id } = req.params as { id: string };
  const { label, amount, category, note, date } = req.body as Partial<Expense>;

  const { data, error } = await supabase
    .from("expenses")
    .update({ label, amount: amount ? Number(amount) : undefined, category, note, date })
    .eq("id", id)
    .eq("tenant_id", businessId)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// ─── DELETE /finance/expenses/:id ─────────────────────────────────────────────
router.delete("/finance/expenses/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { id } = req.params as { id: string };

  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("tenant_id", businessId);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// ─── GET /finance/cashflow — Trésorerie ───────────────────────────────────────
router.get("/finance/cashflow", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const days = Math.min(Number((req.query as Record<string, string>).days ?? "30"), 90);
  const from = formatDate(addDays(new Date(), -days));

  const [ordersRes, expensesRes] = await Promise.all([
    supabase.from("orders").select("total_amount, deposit_amount, created_at").eq("tenant_id", businessId).gte("created_at", from).neq("order_status", "annulée"),
    supabase.from("expenses").select("amount, date").eq("tenant_id", businessId).gte("date", from),
  ]);

  const byDay: Record<string, { entrées: number; sorties: number }> = {};
  const ensure = (d: string) => { if (!byDay[d]) byDay[d] = { entrées: 0, sorties: 0 }; };

  for (const o of (ordersRes.data ?? []) as SupabaseOrder[]) {
    const d = formatDate(new Date(o.created_at));
    ensure(d);
    byDay[d]!.entrées += o.deposit_amount ?? 0;
  }
  for (const e of (expensesRes.data ?? []) as Expense[]) {
    ensure(e.date);
    byDay[e.date]!.sorties += e.amount;
  }

  const result = [];
  let cumulative = 0;
  for (let i = days; i >= 0; i--) {
    const d = formatDate(addDays(new Date(), -i));
    const { entrées = 0, sorties = 0 } = byDay[d] ?? {};
    cumulative += entrées - sorties;
    result.push({ date: d, entrées: Math.round(entrées), sorties: Math.round(sorties), solde: Math.round(cumulative) });
  }
  res.json(result);
});

// ─── GET /finance/forecast — Prévisions IA (7 jours) ─────────────────────────
router.get("/finance/forecast", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const from = formatDate(addDays(new Date(), -60));

  const { data } = await supabase
    .from("orders")
    .select("total_amount, created_at, order_status")
    .eq("tenant_id", businessId)
    .gte("created_at", from)
    .neq("order_status", "annulée");

  const byDay: Record<string, number> = {};
  for (const o of (data ?? []) as SupabaseOrder[]) {
    const d = formatDate(new Date(o.created_at));
    byDay[d] = (byDay[d] ?? 0) + (o.total_amount ?? 0);
  }

  const days = Array.from({ length: 60 }, (_, i) => formatDate(addDays(new Date(), -59 + i)));
  const series = days.map(d => byDay[d] ?? 0);

  const ma7 = series.slice(-7).reduce((a, b) => a + b, 0) / 7;
  const ma14 = series.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const trend = ma14 > 0 ? (ma7 - ma14) / ma14 : 0;

  const forecast = [];
  const history = days.slice(-14).map((d, i) => ({ date: d, réel: Math.round(series[series.length - 14 + i] ?? 0), prévision: null as number | null }));

  for (let i = 1; i <= 7; i++) {
    const seed = (i * 7919) % 100 / 100;
    const projected = Math.max(0, Math.round(ma7 * (1 + trend * i * 0.4) * (0.88 + seed * 0.24)));
    history.push({ date: formatDate(addDays(new Date(), i)), réel: null, prévision: projected });
    forecast.push({ date: formatDate(addDays(new Date(), i)), amount: projected });
  }

  const totalForecast7 = forecast.reduce((s, f) => s + f.amount, 0);
  const confidence = Math.min(95, Math.max(55, 75 + Math.round(Math.abs(trend) < 0.1 ? 15 : -Math.abs(trend) * 50)));

  const alerts: string[] = [];
  if (trend < -0.05) alerts.push("⚠️ Baisse des ventes détectée. Envisagez une promotion flash.");
  if (trend > 0.1)   alerts.push("📈 Forte hausse des commandes ! Assurez-vous d'avoir suffisamment de stock.");
  if (ma7 < 5000)    alerts.push("💡 Revenus faibles. Activez une campagne WhatsApp pour relancer vos clients.");
  if (alerts.length === 0) alerts.push("✅ Tendance stable. Continuez sur cette lancée !");

  res.json({ series: history, forecast, totalForecast7: Math.round(totalForecast7), confidence, trend: Math.round(trend * 1000) / 10, alerts });
});

// ─── GET /finance/profit — Profit & marges ────────────────────────────────────
router.get("/finance/profit", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const months = 6;

  const results = [];
  for (let m = months - 1; m >= 0; m--) {
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const me = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
    const label = ms.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

    const [ordRes, expRes] = await Promise.all([
      supabase.from("orders").select("total_amount").eq("tenant_id", businessId).gte("created_at", ms.toISOString()).lt("created_at", me.toISOString()).neq("order_status", "annulée"),
      supabase.from("expenses").select("amount").eq("tenant_id", businessId).gte("date", formatDate(ms)).lt("date", formatDate(me)),
    ]);

    const rev = (ordRes.data ?? []).reduce((s: number, o: { total_amount: number }) => s + o.total_amount, 0);
    const exp = (expRes.data ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0);
    const profit = rev - exp;
    results.push({ mois: label, revenus: Math.round(rev), dépenses: Math.round(exp), profit: Math.round(profit), marge: rev > 0 ? Math.round((profit / rev) * 100) : 0 });
  }

  res.json(results);
});

export default router;
