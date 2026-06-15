import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { supabase } from "../lib/supabase.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

// ─── GET /withdrawals/balance — Merchant's available balance ─────────────────
router.get("/withdrawals/balance", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;

  // Sum of deposit_amount for orders with payment_status = 'deposit_paid'
  const { data: paidOrders, error: ordErr } = await supabase
    .from("orders")
    .select("deposit_amount")
    .eq("store_id", businessId)
    .eq("payment_status", "deposit_paid");

  if (ordErr) { res.status(500).json({ error: ordErr.message }); return; }

  const totalDeposits = ((paidOrders ?? []) as Array<{ deposit_amount: number }>)
    .reduce((sum, o) => sum + (Number(o.deposit_amount) || 0), 0);

  // Sum of approved withdrawal amounts
  const { data: approvedWithdrawals, error: wErr } = await supabase
    .from("withdrawals")
    .select("amount")
    .eq("store_id", businessId)
    .eq("status", "approved");

  if (wErr) { res.status(500).json({ error: wErr.message }); return; }

  const totalWithdrawn = ((approvedWithdrawals ?? []) as Array<{ amount: number }>)
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const available = Math.max(0, totalDeposits - totalWithdrawn);

  res.json({ available, totalDeposits, totalWithdrawn });
});

// ─── GET /withdrawals — Merchant's withdrawal history ────────────────────────
router.get("/withdrawals", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;

  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("store_id", businessId)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// ─── POST /withdrawals — Merchant requests a withdrawal ──────────────────────
router.post("/withdrawals", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { amount, payout_method, payout_details } = req.body as {
    amount?: number;
    payout_method?: string;
    payout_details?: string;
  };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }
  if (!payout_method) {
    res.status(400).json({ error: "Méthode de retrait requise" });
    return;
  }

  // Verify available balance
  const { data: paidOrders } = await supabase
    .from("orders")
    .select("deposit_amount")
    .eq("store_id", businessId)
    .eq("payment_status", "deposit_paid");

  const { data: approvedWithdrawals } = await supabase
    .from("withdrawals")
    .select("amount")
    .eq("store_id", businessId)
    .eq("status", "approved");

  const totalDeposits = ((paidOrders ?? []) as Array<{ deposit_amount: number }>)
    .reduce((sum, o) => sum + (Number(o.deposit_amount) || 0), 0);
  const totalWithdrawn = ((approvedWithdrawals ?? []) as Array<{ amount: number }>)
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const available = Math.max(0, totalDeposits - totalWithdrawn);

  if (amount > available) {
    res.status(400).json({ error: `Solde insuffisant. Disponible : ${available} FCFA` });
    return;
  }

  const feeAmount   = Math.round(amount * 0.01);
  const netAmount   = amount - feeAmount;

  // Fetch payout_details from store config if not provided
  let finalPayoutDetails = payout_details;
  if (!finalPayoutDetails) {
    const { data: storeData } = await supabase
      .from("stores")
      .select("payment_config")
      .eq("id", businessId)
      .maybeSingle();
    const cfg = storeData?.payment_config as Record<string, unknown> | null;
    const pd = cfg?.payout_details as Record<string, unknown> | null;
    finalPayoutDetails = pd ? JSON.stringify(pd) : "";
  }

  const { data, error } = await supabase
    .from("withdrawals")
    .insert({
      id:              randomUUID(),
      store_id:        businessId,
      amount,
      fee_amount:      feeAmount,
      net_amount:      netAmount,
      payout_method,
      payout_details:  finalPayoutDetails ?? "",
      status:          "pending",
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// ─── GET /admin/withdrawals — All pending withdrawals ────────────────────────
router.get("/admin/withdrawals", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*, stores(business_name)")
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const result = rows.map(w => {
    const store = w.stores as Record<string, unknown> | null;
    return {
      id:             w.id,
      storeId:        w.store_id,
      storeName:      (store?.business_name as string) ?? w.store_id,
      amount:         Number(w.amount),
      feeAmount:      Number(w.fee_amount),
      netAmount:      Number(w.net_amount),
      payoutMethod:   w.payout_method,
      payoutDetails:  w.payout_details,
      status:         w.status,
      createdAt:      w.created_at,
      approvedAt:     w.approved_at ?? null,
    };
  });

  res.json(result);
});

// ─── PUT /admin/withdrawals/:id/approve — Approve a withdrawal ───────────────
router.put("/admin/withdrawals/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const { data: wd, error: fetchErr } = await supabase
    .from("withdrawals")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !wd) { res.status(404).json({ error: "Demande introuvable" }); return; }
  if ((wd as Record<string, unknown>).status === "approved") {
    res.status(409).json({ error: "Déjà approuvé" }); return;
  }

  const { data, error } = await supabase
    .from("withdrawals")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true, data });
});

export default router;
