import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";
import { supabase } from "../lib/supabase.js";

const router: IRouter = Router();

type AuthReq = Request & { auth: AuthPayload };

// ─── GET /billing/me ─────────────────────────────────────────────────────────
// Returns the subscription plan info + past invoices for the authenticated store.
router.get("/billing/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;

  // Fetch store plan info
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, subscription_plan, created_at, trial_ends_at")
    .eq("id", businessId)
    .maybeSingle();

  if (storeError || !store) {
    res.status(404).json({ error: "Boutique introuvable" });
    return;
  }

  // Fetch invoices for this store
  type InvRow = Record<string, unknown>;
  let invoices: InvRow[] = [];

  const withPayment = await supabase
    .from("invoices")
    .select("id, plan, amount, status, notes, created_at, paid_at, payment_provider, payment_ref")
    .eq("store_id", businessId)
    .order("created_at", { ascending: false });

  if (withPayment.error) {
    const fallback = await supabase
      .from("invoices")
      .select("id, plan, amount, status, notes, created_at, paid_at")
      .eq("store_id", businessId)
      .order("created_at", { ascending: false });
    if (!fallback.error) invoices = (fallback.data ?? []) as InvRow[];
  } else {
    invoices = (withPayment.data ?? []) as InvRow[];
  }

  const mappedInvoices = invoices.map((inv) => ({
    id:              inv.id,
    plan:            inv.plan,
    amount:          Number(inv.amount as number),
    status:          inv.status,
    notes:           (inv.notes as string) ?? null,
    createdAt:       inv.created_at,
    paidAt:          (inv.paid_at as string) ?? null,
    paymentProvider: (inv.payment_provider as string) ?? null,
    paymentRef:      (inv.payment_ref as string) ?? null,
  }));

  // Compute next renewal date: last paid invoice + 30 days
  const lastPaid = mappedInvoices.find((i) => i.status === "paid");
  let renewalDate: string | null = null;
  if (lastPaid?.paidAt) {
    const d = new Date(lastPaid.paidAt as string);
    d.setDate(d.getDate() + 30);
    renewalDate = d.toISOString();
  }

  res.json({
    plan:        (store.subscription_plan as string) ?? "starter",
    trialEndsAt: (store.trial_ends_at as string) ?? null,
    renewalDate,
    invoices:    mappedInvoices,
  });
});

export default router;
