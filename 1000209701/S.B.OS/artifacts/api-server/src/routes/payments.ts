
import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../lib/supabase.js";
import { sendWhatsApp } from "../services/whatsappService.js";
import { emitOrderUpdate, emitStatsRefresh } from "../lib/socket.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";
import { deductStock } from "./orders.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

// ─── POST /payments/webhook/fedapay ──────────────────────────────────────────
// Webhook appelé par FedaPay quand un paiement est confirmé.
router.post("/payments/webhook/fedapay", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  const event = body.event as string | undefined;
  const data  = (body.data ?? body.entity ?? body) as Record<string, unknown>;

  const status = ((data.status as string) ?? "").toLowerCase();
  if (event && !event.includes("approved") && status !== "approved") {
    res.json({ received: true }); return;
  }

  const fedaId  = String(data.id   ?? data.transaction_id ?? "");
  const fedaRef = String(data.reference ?? fedaId);

  const meta    = (data.metadata ?? data.custom_metadata ?? {}) as Record<string, unknown>;
  const orderId = (meta.order_id ?? data.order_id ?? data.orderid ?? "") as string;
  const amount  = Number(data.amount ?? 0);

  if (!orderId) {
    console.warn("[fedapay/webhook] No order_id in payload:", JSON.stringify(body).slice(0, 300));
    res.status(400).json({ error: "Missing order_id in metadata" }); return;
  }

  // ── Fetch la commande ────────────────────────────────────────────────────────
  const { data: order, error: ordErr } = await supabase
    .from("orders")
    .select("id, store_id, customer_name, customer_phone, deposit_amount, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr || !order) {
    console.error("[fedapay/webhook] Order not found:", orderId);
    res.status(404).json({ error: "Order not found" }); return;
  }

  const ord = order as Record<string, unknown>;

  if (ord.payment_status === "deposit_paid") {
    res.json({ received: true, alreadyPaid: true }); return;
  }

  // ── Marquer la commande comme acompte payé ───────────────────────────────────
  const { data: updatedOrder, error: updateErr } = await supabase
    .from("orders")
    .update({
      payment_status:    "deposit_paid",
      payment_reference: fedaRef,
      order_status:      "confirmée",   // passe automatiquement en confirmée
    })
    .eq("id", orderId)
    .select()
    .single();

  if (updateErr) {
    console.error("[fedapay/webhook] Failed to update order:", updateErr.message);
    res.status(500).json({ error: updateErr.message }); return;
  }

  console.log(`[fedapay/webhook] Order ${orderId} deposit paid — ref: ${fedaRef}, amount: ${amount}`);

  const storeId   = ord.store_id as string;
  const custName  = (ord.customer_name as string) ?? "Client";
  const custPhone = (ord.customer_phone as string) ?? "";
  const deposit   = Number(ord.deposit_amount ?? 0);

  // ── Déduction du stock après paiement confirmé ───────────────────────────────
  if (updatedOrder) {
    const paidItems = (updatedOrder.items as Array<Record<string, unknown>>) ?? [];
    void deductStock(storeId, paidItems.map(i => ({
      productId: (i.product_id ?? i.productId) as string | undefined,
      quantity:  Number(i.qty ?? i.quantity ?? 1),
    })));
  }

  // ── Émettre Socket.io → dashboard mis à jour en temps réel ──────────────────
  if (updatedOrder) {
    const info = (updatedOrder.delivery_info as Record<string, unknown>) ?? {};
    const rawItems = (updatedOrder.items as Array<Record<string, unknown>>) ?? [];
    const frontendOrder = {
      id:              updatedOrder.id as string,
      clientName:      (updatedOrder.customer_name as string) ?? "",
      clientPhone:     (updatedOrder.customer_phone as string) ?? "",
      total:           Number(updatedOrder.total_amount ?? 0),
      depositAmount:   Number(updatedOrder.deposit_amount ?? 0),
      status:          (updatedOrder.order_status as string) ?? "confirmée",
      orderType:       (info.type as string) ?? "dine-in",
      createdAt:       (updatedOrder.created_at as string) ?? new Date().toISOString(),
      notes:           (info.notes as string) ?? null,
      assignedStaffId: (info.assigned_staff_id as string) ?? null,
      items: rawItems.map((i: Record<string, unknown>) => ({
        name:     String(i.name ?? ""),
        quantity: Number(i.qty ?? i.quantity ?? 1),
        price:    Number(i.price ?? 0),
      })),
    };
    emitOrderUpdate(storeId, frontendOrder);
    emitStatsRefresh(storeId);
  }

  // ── Fetch les infos du commerce ──────────────────────────────────────────────
  const { data: storeRow } = await supabase
    .from("stores")
    .select("business_name, payment_config, phone")
    .eq("id", storeId)
    .maybeSingle();

  const storeName     = (storeRow?.business_name as string) ?? "SmartOrder AI";
  const merchantPhone = (storeRow?.phone as string) ?? "";

  // ── WhatsApp au client : reçu de paiement ────────────────────────────────────
  if (custPhone) {
    const custMsg =
      `✅ *Acompte confirmé !*\n\n` +
      `Bonjour ${custName},\n` +
      `Votre acompte de *${deposit.toLocaleString("fr-FR")} FCFA* a bien été reçu pour votre commande chez *${storeName}*.\n\n` +
      `🧾 Référence : ${fedaRef}\n` +
      `📦 Votre commande est maintenant *confirmée*. Vous serez notifié(e) dès qu'elle sera prête.\n\n` +
      `Merci pour votre confiance ! 🙏`;
    await sendWhatsApp({ storeId, orderId, recipientPhone: custPhone, message: custMsg });
  }

  // ── WhatsApp au commerçant : crédit reçu ─────────────────────────────────────
  const cfg = storeRow?.payment_config as Record<string, unknown> | null;
  const pd  = cfg?.payout_details as Record<string, unknown> | null;
  const payoutPhone = (pd?.phone as string) ?? merchantPhone;

  if (payoutPhone) {
    const merchantMsg =
      `💰 *Paiement reçu sur votre compte SmartOrder !*\n\n` +
      `Client : ${custName} (${custPhone})\n` +
      `Acompte crédité : *${deposit.toLocaleString("fr-FR")} FCFA*\n` +
      `Référence FedaPay : ${fedaRef}\n\n` +
      `✅ Solde disponible mis à jour sur votre tableau de bord.`;
    await sendWhatsApp({ storeId, orderId, recipientPhone: payoutPhone, message: merchantMsg });
  }

  res.json({ received: true, paid: true });
});

// ─── POST /payments/create-link — protected ───────────────────────────────────
// Génère un lien de paiement FedaPay pour une commande existante (depuis le dashboard).
router.post("/payments/create-link", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { orderId } = req.body as { orderId: string };

  if (!orderId) {
    res.status(400).json({ error: "orderId requis" }); return;
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, store_id, customer_name, customer_phone, deposit_amount, payment_status")
    .eq("id", orderId)
    .eq("store_id", businessId)
    .maybeSingle();

  if (!order) {
    res.status(404).json({ error: "Commande introuvable" }); return;
  }

  if ((order.payment_status as string) === "deposit_paid") {
    res.status(400).json({ error: "Acompte déjà payé pour cette commande" }); return;
  }

  const secret = process.env.FEDAPAY_SECRET_KEY;
  if (!secret) {
    res.status(503).json({ error: "FedaPay non configuré — ajoutez FEDAPAY_SECRET_KEY" }); return;
  }

  const { data: storeRow } = await supabase
    .from("stores")
    .select("business_name")
    .eq("id", businessId)
    .maybeSingle();

  const businessName = (storeRow?.business_name as string) ?? "SmartOrder AI";
  const deposit = Number(order.deposit_amount ?? 0);
  const appUrl = process.env.APP_URL ?? "https://smartorder.app";

  try {
    const body = {
      description: `Acompte commande #${orderId.slice(0, 8).toUpperCase()} — ${businessName}`,
      amount: Math.round(deposit * 100),
      currency: { iso: "XOF" },
      callback_url: `${appUrl}/api/payments/webhook/fedapay`,
      metadata: { order_id: orderId },
      customer: {
        firstname: (order.customer_name as string).split(" ")[0] ?? order.customer_name,
        lastname:  (order.customer_name as string).split(" ").slice(1).join(" ") || "-",
        phone_number: { number: order.customer_phone as string, country: "CI" },
      },
    };

    const txRes = await fetch("https://api.fedapay.com/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
    });

    if (!txRes.ok) {
      const txt = await txRes.text();
      res.status(502).json({ error: `FedaPay: ${txt}` }); return;
    }

    const txData = await txRes.json() as { v1?: { transaction?: { id?: number } }; id?: number };
    const txId = txData?.v1?.transaction?.id ?? txData?.id;
    if (!txId) {
      res.status(502).json({ error: "FedaPay: impossible d'obtenir l'ID de transaction" }); return;
    }

    const tokenRes = await fetch(`https://api.fedapay.com/v1/transactions/${txId}/token`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${secret}` },
    });

    if (!tokenRes.ok) {
      res.status(502).json({ error: "FedaPay: impossible de générer le token" }); return;
    }

    const tokenData = await tokenRes.json() as { token?: string };
    const token = tokenData?.token;
    if (!token) {
      res.status(502).json({ error: "FedaPay: token absent" }); return;
    }

    const paymentUrl = `https://checkout.fedapay.com/${token}`;

    // Sauvegarder le lien dans la commande
    await supabase.from("orders").update({ payment_url: paymentUrl }).eq("id", orderId);

    res.json({ paymentUrl, depositAmount: deposit });
  } catch (err) {
    console.error("[payments/create-link] Error:", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ─── POST /payments/orange-money/notify ──────────────────────────────────────
// Webhook Orange Money pour les abonnements.
router.post("/payments/orange-money/notify", async (req: Request, res: Response): Promise<void> => {
  const testMode    = process.env.ORANGE_MONEY_TEST_MODE === "true";
  const notifSecret = process.env.ORANGE_MONEY_NOTIF_SECRET;
  const body        = req.body as Record<string, unknown>;

  const status     = (body.status     as string | undefined)?.toUpperCase();
  const txnId      = body.txnid       as string | undefined;
  const orderId    = body.orderid     as string | undefined;
  const notifToken = body.notif_token as string | undefined;
  const notifAmount = body.amount     != null ? Number(body.amount) : null;

  if (!orderId) {
    res.status(400).json({ error: "Missing orderid" }); return;
  }

  if (!testMode) {
    if (!notifSecret) {
      console.error("[orange-money/notify] ORANGE_MONEY_NOTIF_SECRET is not configured");
      res.status(503).json({ error: "Webhook verification not configured" }); return;
    }
    if (notifToken !== notifSecret) {
      console.warn("[orange-money/notify] Invalid notif_token");
      res.status(401).json({ error: "Invalid notif_token" }); return;
    }
  } else {
    const expectedTestToken = `test_om_notify_${orderId}`;
    if (notifToken !== expectedTestToken) {
      console.warn("[orange-money/notify][test] Invalid test token");
      res.status(401).json({ error: "Invalid test token" }); return;
    }
  }

  if (status !== "SUCCESS") {
    res.json({ received: true }); return;
  }

  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .select("id, store_id, plan, amount, status")
    .eq("id", orderId)
    .maybeSingle();

  if (invError || !invoice) {
    res.status(404).json({ error: "Invoice not found" }); return;
  }

  if (notifAmount !== null && Number(invoice.amount) !== notifAmount) {
    res.status(400).json({ error: "Amount mismatch" }); return;
  }

  if (invoice.status === "paid") {
    res.json({ received: true, alreadyPaid: true }); return;
  }

  const now = new Date().toISOString();

  const fullUpdate = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: now, payment_provider: "orange_money", payment_ref: txnId ?? null })
    .eq("id", orderId);

  if (fullUpdate.error) {
    const basicUpdate = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: now })
      .eq("id", orderId);
    if (basicUpdate.error) {
      res.status(500).json({ error: basicUpdate.error.message }); return;
    }
  }

  await supabase
    .from("stores")
    .update({ subscription_plan: invoice.plan })
    .eq("id", invoice.store_id);

  res.json({ received: true, paid: true });
});

export default router;
