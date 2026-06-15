
import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";
import { emitOrderUpdate, emitNewOrder, emitStatsRefresh } from "../lib/socket.js";
import { sendWhatsApp } from "../services/whatsappService.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

// ─── Supabase columns → Frontend shape ────────────────────────────────────────
//
//  Supabase         │ Frontend (Commandes.tsx)
//  ─────────────────┼─────────────────────────
//  store_id         │ (not exposed)
//  customer_name    │ clientName
//  customer_phone   │ clientPhone
//  total_amount     │ total
//  deposit_amount   │ depositAmount
//  order_status     │ status
//  created_at       │ createdAt
//  delivery_info    │ { type→orderType, notes, assigned_staff_id→assignedStaffId }
//  items[{name,qty}]│ items[{name, quantity, price}]

interface FrontendOrder {
  id: string;
  clientName: string;
  clientPhone: string;
  total: number;
  depositAmount: number;
  status: string;
  orderType: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  createdAt: string;
  notes?: string | null;
  assignedStaffId?: string | null;
  paymentUrl?: string | null;
}

function toFrontend(row: Record<string, unknown>): FrontendOrder {
  const info = (row.delivery_info as Record<string, unknown>) ?? {};
  const rawItems = (row.items as Array<Record<string, unknown>>) ?? [];
  return {
    id:              row.id as string,
    clientName:      (row.customer_name as string) ?? "",
    clientPhone:     (row.customer_phone as string) ?? "",
    total:           Number(row.total_amount ?? 0),
    depositAmount:   Number(row.deposit_amount ?? 0),
    status:          (row.order_status as string) ?? "reçue",
    orderType:       (info.type as string) ?? "dine-in",
    createdAt:       (row.created_at as string) ?? new Date().toISOString(),
    notes:           (info.notes as string) ?? null,
    assignedStaffId: (info.assigned_staff_id as string) ?? null,
    paymentUrl:      (row.payment_url as string) ?? null,
    items: rawItems.map(i => ({
      name:     String(i.name ?? ""),
      quantity: Number(i.qty ?? i.quantity ?? 1),
      price:    Number(i.price ?? 0),
    })),
  };
}

// ─── FedaPay: créer un lien de paiement pour l'acompte ────────────────────────
async function createFedaPayLink(params: {
  orderId: string;
  amount: number;       // en FCFA (entier)
  customerName: string;
  customerPhone: string;
  businessName: string;
}): Promise<string | null> {
  const secret = process.env.FEDAPAY_SECRET_KEY;
  if (!secret) {
    console.warn("[orders] FEDAPAY_SECRET_KEY non configuré — lien de paiement ignoré");
    return null;
  }

  // FedaPay attend le montant en centimes (FCFA × 100)
  const amountCents = Math.round(params.amount * 100);
  const appUrl = process.env.APP_URL ?? "https://smartorder.app";

  try {
    const body = {
      description: `Acompte commande SmartOrder #${params.orderId.slice(0, 8).toUpperCase()}`,
      amount: amountCents,
      currency: { iso: "XOF" },
      callback_url: `${appUrl}/api/payments/webhook/fedapay`,
      metadata: { order_id: params.orderId },
      customer: {
        firstname: params.customerName.split(" ")[0] ?? params.customerName,
        lastname:  params.customerName.split(" ").slice(1).join(" ") || "-",
        phone_number: { number: params.customerPhone, country: "CI" },
      },
    };

    const res = await fetch("https://api.fedapay.com/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[orders] FedaPay transaction create error:", txt);
      return null;
    }

    const data = await res.json() as { v1?: { transaction?: { id?: number } }; id?: number };
    const txId = data?.v1?.transaction?.id ?? data?.id;
    if (!txId) return null;

    // Générer le lien de paiement FedaPay
    const tokenRes = await fetch(`https://api.fedapay.com/v1/transactions/${txId}/token`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${secret}` },
    });

    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json() as { token?: string };
    const token = tokenData?.token;
    if (!token) return null;

    return `https://checkout.fedapay.com/${token}`;
  } catch (err) {
    console.error("[orders] FedaPay error:", err);
    return null;
  }
}

// ─── Déduire le stock des produits commandés ───────────────────────────────────
// Appelé UNIQUEMENT après confirmation du paiement de l'acompte (webhook FedaPay).
// La colonne en base est "stock_qty" (schema Drizzle: stockQty) et "available".
export async function deductStock(
  businessId: string,
  items: Array<{ productId?: string; product_id?: string; quantity?: number; qty?: number }>
): Promise<void> {
  for (const item of items) {
    const productId = item.productId ?? item.product_id;
    const qty = Number(item.quantity ?? item.qty ?? 1);
    if (!productId) continue;
    try {
      // Fetch current stock — colonnes réelles en base Supabase
      const { data: product } = await supabase
        .from("products")
        .select("id, stock_qty, available")
        .eq("id", productId)
        .eq("store_id", businessId)
        .maybeSingle();

      if (!product) continue;

      const currentStock = Number((product as Record<string, unknown>).stock_qty ?? 0);
      const newStock = Math.max(0, currentStock - qty);
      const updates: Record<string, unknown> = { stock_qty: newStock };

      // Si stock tombe à 0, marquer le produit indisponible automatiquement
      if (newStock === 0) {
        updates.available = false;
      }

      await supabase
        .from("products")
        .update(updates)
        .eq("id", productId)
        .eq("store_id", businessId);

      console.log(`[stock] Product ${productId}: ${currentStock} → ${newStock}`);
    } catch (err) {
      console.warn(`[orders] Stock deduction failed for product ${productId}:`, err);
    }
  }
}

// ─── GET /orders — protected ──────────────────────────────────────────────────
router.get("/orders", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { status, dateFrom, dateTo } = req.query as {
    status?: string; dateFrom?: string; dateTo?: string;
  };

  let query = supabase
    .from("orders")
    .select("*")
    .eq("store_id", businessId)
    .order("created_at", { ascending: false });

  if (status)   query = query.eq("order_status", status);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo)   query = query.lte("created_at", dateTo);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json((data ?? []).map(r => toFrontend(r as Record<string, unknown>)));
});

// ─── POST /orders — public (customer order page) ──────────────────────────────
router.post("/orders", async (req: Request, res: Response): Promise<void> => {
  const {
    businessId, clientName, clientPhone, clientEmail,
    items, total, orderType, scheduledAt, notes,
  } = req.body as {
    businessId: string; clientName: string; clientPhone: string; clientEmail?: string;
    items: Array<{ productId?: string; name: string; price: number; quantity: number }>;
    total: number; orderType: string;
    scheduledAt?: string; notes?: string;
  };

  if (!businessId || !clientName || !clientPhone || !items?.length || total == null || !orderType) {
    res.status(400).json({ error: "Champs obligatoires manquants" });
    return;
  }

  // ── Acompte 25% calculé et forcé côté serveur ────────────────────────────────
  const depositAmount = Math.round(total * 0.25);

  // ── Récupérer le nom de l'entreprise ─────────────────────────────────────────
  const { data: storeRow } = await supabase
    .from("stores")
    .select("business_name, phone")
    .eq("id", businessId)
    .maybeSingle();

  const businessName = (storeRow?.business_name as string) ?? "SmartOrder AI";
  const merchantPhone = (storeRow?.phone as string) ?? "";

  const orderId = randomUUID();

  const payload = {
    id:             orderId,
    store_id:       businessId,
    customer_name:  clientName,
    customer_phone: clientPhone,
    items: items.map(i => ({
      name:       i.name,
      qty:        i.quantity,
      price:      i.price,
      product_id: i.productId ?? null,
    })),
    total_amount:   total,
    deposit_amount: depositAmount,
    payment_status: "pending",
    order_status:   "reçue",
    delivery_info: {
      type:              orderType,
      notes:             notes ?? null,
      email:             clientEmail ?? null,
      scheduledAt:       scheduledAt ?? null,
      assigned_staff_id: null,
    },
  };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(payload)
    .select()
    .single();

  if (orderError || !order) {
    res.status(500).json({ error: orderError?.message ?? "Erreur création commande" });
    return;
  }

  // ── Génération du lien de paiement FedaPay (acompte 25%) ─────────────────────
  const paymentUrl = await createFedaPayLink({
    orderId,
    amount: depositAmount,
    customerName: clientName,
    customerPhone: clientPhone,
    businessName,
  });

  // Stocker le lien dans la commande si disponible (fire-and-forget)
  if (paymentUrl) {
    void supabase
      .from("orders")
      .update({ payment_url: paymentUrl })
      .eq("id", orderId);
  }

  const frontendOrder: FrontendOrder = {
    ...toFrontend(order as Record<string, unknown>),
    paymentUrl: paymentUrl ?? null,
  };

  // NOTE: Le stock est déduit UNIQUEMENT après confirmation du paiement de l'acompte
  // (dans payments.ts webhook FedaPay), pas ici, pour éviter les fausses déductions
  // si le client abandonne sans payer.

  // ── WhatsApp immédiat au client (récapitulatif + lien de paiement) ────────────
  void (async () => {
    try {
      const itemsList = items
        .map(i => `• ${i.name} × ${i.quantity} = ${(i.price * i.quantity).toLocaleString("fr-FR")} FCFA`)
        .join("\n");

      const paymentLine = paymentUrl
        ? `\n\n💳 *Payez votre acompte (25%) ici :*\n${paymentUrl}`
        : "";

      const custMsg =
        `🛍️ *Commande reçue chez ${businessName}*\n\n` +
        `Bonjour ${clientName}, votre commande a bien été enregistrée !\n\n` +
        `*Vos articles :*\n${itemsList}\n\n` +
        `💰 Total : *${total.toLocaleString("fr-FR")} FCFA*\n` +
        `🔒 Acompte (25%) : *${depositAmount.toLocaleString("fr-FR")} FCFA*` +
        paymentLine +
        `\n\n📦 Le reste sera réglé à la livraison.\n` +
        `Réf. commande : #${orderId.slice(0, 8).toUpperCase()}`;

      await sendWhatsApp({
        storeId: businessId,
        orderId,
        recipientPhone: clientPhone,
        message: custMsg,
      });

      // Notification au commerçant
      if (merchantPhone) {
        const itemsSummary = items.map(i => `${i.name} ×${i.quantity}`).join(", ");
        const merchantMsg =
          `🔔 *Nouvelle commande SmartOrder !*\n\n` +
          `👤 Client : ${clientName} (${clientPhone})\n` +
          `🛒 ${itemsSummary}\n` +
          `💰 Total : ${total.toLocaleString("fr-FR")} FCFA\n` +
          `🔒 Acompte attendu : ${depositAmount.toLocaleString("fr-FR")} FCFA\n` +
          `📋 Type : ${orderType}\n` +
          (notes ? `📝 Notes : ${notes}\n` : "") +
          `\nRéf. : #${orderId.slice(0, 8).toUpperCase()}`;

        await sendWhatsApp({
          storeId: businessId,
          orderId,
          recipientPhone: merchantPhone,
          message: merchantMsg,
        });
      }
    } catch (err) {
      console.warn("[orders] WhatsApp notification failed:", err);
    }
  })();

  // ── Upsert client record — fire and forget ────────────────────────────────────
  void (async () => {
    try {
      const { data: existing } = await supabase
        .from("clients")
        .select("id, total_orders, total_spent")
        .eq("store_id", businessId)
        .eq("phone", clientPhone)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("clients")
          .update({
            total_orders:  ((existing.total_orders as number) ?? 0) + 1,
            total_spent:   ((existing.total_spent as number) ?? 0) + total,
            last_order_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("clients").insert({
          id:            randomUUID(),
          store_id:      businessId,
          name:          clientName,
          phone:         clientPhone,
          email:         clientEmail ?? null,
          total_orders:  1,
          total_spent:   total,
          last_order_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[orders] Client upsert failed:", err);
    }
  })();

  emitNewOrder(businessId, frontendOrder);
  res.status(201).json(frontendOrder);
});

// ─── GET /orders/:id — public (order tracking page) ──────────────────────────
router.get("/orders/:id", async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", rawId)
    .maybeSingle();

  if (error || !data) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  res.json(toFrontend(data as Record<string, unknown>));
});

// ─── PUT /orders/:id/status — protected ──────────────────────────────────────
router.put("/orders/:id/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status } = req.body as { status: string };

  if (!status) {
    res.status(400).json({ error: "status requis" });
    return;
  }

  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("id", rawId)
    .eq("store_id", businessId)
    .maybeSingle();

  if (!existing) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ order_status: status })
    .eq("id", rawId)
    .eq("store_id", businessId)
    .select()
    .single();

  if (error || !updated) {
    res.status(500).json({ error: error?.message ?? "Erreur mise à jour statut" });
    return;
  }

  const frontendOrder = toFrontend(updated as Record<string, unknown>);
  emitOrderUpdate(businessId, frontendOrder);
  emitStatsRefresh(businessId);
  res.json(frontendOrder);
});

// ─── PUT /orders/:id/assign — protected ──────────────────────────────────────
router.put("/orders/:id/assign", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { staffId } = req.body as { staffId: string | null };

  const { data: existing } = await supabase
    .from("orders")
    .select("id, delivery_info")
    .eq("id", rawId)
    .eq("store_id", businessId)
    .maybeSingle();

  if (!existing) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  const currentInfo = (existing.delivery_info as Record<string, unknown>) ?? {};
  const newInfo = { ...currentInfo, assigned_staff_id: staffId ?? null };

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ delivery_info: newInfo })
    .eq("id", rawId)
    .eq("store_id", businessId)
    .select()
    .single();

  if (error || !updated) {
    res.status(500).json({ error: error?.message ?? "Erreur assignation" });
    return;
  }

  const frontendOrder = toFrontend(updated as Record<string, unknown>);
  emitOrderUpdate(businessId, frontendOrder);
  res.json(frontendOrder);
});

export default router;
