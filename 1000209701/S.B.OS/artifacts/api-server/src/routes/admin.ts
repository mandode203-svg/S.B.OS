import { Router, type IRouter, type Request, type Response } from "express";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { supabase } from "../lib/supabase.js";
import https from "https";
import querystring from "querystring";

const router: IRouter = Router();

// All routes under /admin are protected by requireAdmin
router.use("/admin", requireAdmin);

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
router.get("/admin/stats", async (_req: Request, res: Response): Promise<void> => {
  const [storesRes, productsRes, ordersRes, logsRes, revenueRes, invoicesRes] = await Promise.all([
    supabase.from("stores").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("communication_logs").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("total_amount"),
    supabase.from("invoices").select("amount, status"),
  ]);

  const totalRevenue = ((revenueRes.data ?? []) as Array<{ total_amount: number }>).reduce(
    (sum, row) => sum + (Number(row.total_amount) || 0),
    0
  );

  const totalBilled = ((invoicesRes.data ?? []) as Array<{ amount: number; status: string }>).reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0
  );
  const totalCollected = ((invoicesRes.data ?? []) as Array<{ amount: number; status: string }>)
    .filter(r => r.status === "paid")
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  res.json({
    totalStores:        storesRes.count   ?? 0,
    totalProducts:      productsRes.count ?? 0,
    totalOrders:        ordersRes.count   ?? 0,
    totalNotifications: logsRes.count     ?? 0,
    totalRevenue,
    totalBilled,
    totalCollected,
  });
});

// ─── GET /admin/shops ─────────────────────────────────────────────────────────
router.get("/admin/shops", async (_req: Request, res: Response): Promise<void> => {
  const { data: stores, error: storeError } = await supabase
    .from("stores")
    .select("id, business_name, category, subscription_plan, active, created_at, owner_id")
    .order("created_at", { ascending: false });

  if (storeError) {
    res.status(500).json({ error: storeError.message });
    return;
  }

  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map<string, string>();
  for (const user of usersData?.users ?? []) {
    emailMap.set(user.id, user.email ?? "");
  }

  const shops = (stores ?? []).map((s) => ({
    id:         s.id,
    name:       s.business_name,
    category:   s.category,
    plan:       s.subscription_plan ?? "starter",
    active:     s.active ?? true,
    createdAt:  s.created_at,
    ownerEmail: emailMap.get(s.owner_id as string) ?? (s.owner_id as string),
  }));

  res.json(shops);
});

// ─── PUT /admin/shops/:shopId/plan ────────────────────────────────────────────
router.put("/admin/shops/:shopId/plan", async (req: Request, res: Response): Promise<void> => {
  const { shopId } = req.params as { shopId: string };
  const { plan } = req.body as { plan?: string };

  const validPlans = ["starter", "business", "pro"];
  if (!plan || !validPlans.includes(plan)) {
    res.status(400).json({ error: `Plan invalide. Valeurs acceptées : ${validPlans.join(", ")}` });
    return;
  }

  const { data, error } = await supabase
    .from("stores")
    .update({ subscription_plan: plan })
    .eq("id", shopId)
    .select("id, subscription_plan")
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true, data });
});

// ─── PUT /admin/shops/:shopId/toggle ─────────────────────────────────────────
router.put("/admin/shops/:shopId/toggle", async (req: Request, res: Response): Promise<void> => {
  const { shopId } = req.params as { shopId: string };

  const { data: current, error: fetchError } = await supabase
    .from("stores")
    .select("id, active")
    .eq("id", shopId)
    .maybeSingle();

  if (fetchError || !current) {
    res.status(404).json({ error: "Boutique introuvable" });
    return;
  }

  const newActive = !(current.active as boolean);

  const { data, error } = await supabase
    .from("stores")
    .update({ active: newActive })
    .eq("id", shopId)
    .select("id, active")
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true, active: data.active });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICES — SaaS Billing Management
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /admin/invoices ──────────────────────────────────────────────────────
router.get("/admin/invoices", async (_req: Request, res: Response): Promise<void> => {
  // Try selecting with payment columns; fall back if they don't exist yet (migration pending)
  type InvRow = Record<string, unknown>;
  let rows: InvRow[] = [];

  const withPayment = await supabase
    .from("invoices")
    .select("id, store_id, plan, amount, status, notes, created_at, paid_at, payment_provider, payment_ref, stores(business_name)")
    .order("created_at", { ascending: false });

  if (withPayment.error) {
    // Columns might not exist yet — fallback without them
    const fallback = await supabase
      .from("invoices")
      .select("id, store_id, plan, amount, status, notes, created_at, paid_at, stores(business_name)")
      .order("created_at", { ascending: false });
    if (fallback.error) { res.status(500).json({ error: fallback.error.message }); return; }
    rows = (fallback.data ?? []) as InvRow[];
  } else {
    rows = (withPayment.data ?? []) as InvRow[];
  }

  const invoices = rows.map((inv) => {
    const storeObj = inv.stores as Record<string, unknown> | null;
    return {
      id:              inv.id,
      storeId:         inv.store_id,
      storeName:       (storeObj?.business_name as string) ?? inv.store_id,
      plan:            inv.plan,
      amount:          Number(inv.amount as number),
      status:          inv.status,
      notes:           (inv.notes as string) ?? null,
      createdAt:       inv.created_at,
      paidAt:          (inv.paid_at as string) ?? null,
      paymentProvider: (inv.payment_provider as string) ?? null,
      paymentRef:      (inv.payment_ref as string) ?? null,
    };
  });

  res.json(invoices);
});

// ─── POST /admin/invoices ─────────────────────────────────────────────────────
router.post("/admin/invoices", async (req: Request, res: Response): Promise<void> => {
  const { storeId, plan, amount, notes } = req.body as {
    storeId?: string; plan?: string; amount?: number; notes?: string;
  };

  if (!storeId || !plan || amount == null) {
    res.status(400).json({ error: "storeId, plan et amount sont obligatoires" });
    return;
  }

  const validPlans = ["starter", "business", "pro"];
  if (!validPlans.includes(plan)) {
    res.status(400).json({ error: `Plan invalide. Valeurs acceptées : ${validPlans.join(", ")}` });
    return;
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      store_id: storeId,
      plan,
      amount,
      notes: notes ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json({ success: true, invoice: data });
});

// ─── PUT /admin/invoices/:invoiceId/pay ───────────────────────────────────────
// Marks an invoice as paid AND upgrades the store's subscription plan
router.put("/admin/invoices/:invoiceId/pay", async (req: Request, res: Response): Promise<void> => {
  const { invoiceId } = req.params as { invoiceId: string };

  // 1. Fetch the invoice
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .select("id, store_id, plan, status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invError || !invoice) {
    res.status(404).json({ error: "Facture introuvable" });
    return;
  }

  if (invoice.status === "paid") {
    res.status(409).json({ error: "Cette facture est déjà réglée" });
    return;
  }

  const now = new Date().toISOString();

  // 2. Mark invoice as paid
  const { error: updateInvErr } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: now })
    .eq("id", invoiceId);

  if (updateInvErr) { res.status(500).json({ error: updateInvErr.message }); return; }

  // 3. Upgrade store plan to match the paid invoice
  const { error: updateStoreErr } = await supabase
    .from("stores")
    .update({ subscription_plan: invoice.plan })
    .eq("id", invoice.store_id);

  if (updateStoreErr) {
    console.error("[admin/invoices] store plan update failed:", updateStoreErr.message);
    // Don't fail the request — invoice is already marked paid
  }

  res.json({ success: true, paidAt: now, plan: invoice.plan });
});

// ─── POST /admin/invoices/:invoiceId/pay-online ───────────────────────────────
// Initiates an Orange Money WebPay payment for a pending invoice.
// In TEST MODE (ORANGE_MONEY_TEST_MODE=true) returns a local simulation URL.
// In PRODUCTION MODE calls the real Orange Money WebPay API.
router.post("/admin/invoices/:invoiceId/pay-online", async (req: Request, res: Response): Promise<void> => {
  const { invoiceId } = req.params as { invoiceId: string };

  const clientId     = process.env.ORANGE_MONEY_CLIENT_ID;
  const clientSecret = process.env.ORANGE_MONEY_CLIENT_SECRET;
  const merchantKey  = process.env.ORANGE_MONEY_MERCHANT_KEY;
  const testMode     = process.env.ORANGE_MONEY_TEST_MODE === "true";

  if (!clientId || !clientSecret || !merchantKey) {
    res.status(503).json({ error: "Orange Money non configuré — veuillez contacter l'administrateur" });
    return;
  }

  // 1. Fetch the invoice
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .select("id, store_id, plan, amount, status, stores(business_name)")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invError || !invoice) {
    res.status(404).json({ error: "Facture introuvable" });
    return;
  }

  if (invoice.status === "paid") {
    res.status(409).json({ error: "Cette facture est déjà réglée" });
    return;
  }

  const notifSecret = process.env.ORANGE_MONEY_NOTIF_SECRET;
  const appDomain   = process.env.APP_DOMAIN ?? `https://${process.env.REPLIT_DEV_DOMAIN ?? "localhost"}`;
  const returnUrl   = `${appDomain}/admin?payment=success&invoice=${invoiceId}`;
  const cancelUrl   = `${appDomain}/admin?payment=cancelled&invoice=${invoiceId}`;
  const notifUrl    = `${appDomain}/api/payments/orange-money/notify`;
  const storeObj    = invoice.stores as Record<string, unknown> | null;
  const storeName   = (storeObj?.business_name as string) ?? "";

  // ── TEST MODE: return a local simulation page ─────────────────────────────
  if (testMode) {
    // Deterministic per-invoice test token — verified by the webhook handler
    const testToken = `test_om_notify_${invoiceId}`;
    const params = new URLSearchParams({
      invoice:    invoiceId,
      amount:     String(invoice.amount),
      plan:       invoice.plan as string,
      storeName,
      returnUrl,
      cancelUrl,
      notifUrl,
      notifToken: testToken,
    });
    const simUrl = `${appDomain}/payment-sim?${params.toString()}`;

    await supabase.from("invoices").update({
      payment_provider: "orange_money",
      payment_url:      simUrl,
    }).eq("id", invoiceId).maybeSingle();

    res.json({ paymentUrl: simUrl, testMode: true });
    return;
  }

  // ── PRODUCTION MODE: call the real Orange Money WebPay API ────────────────
  // Webhook verification secret is mandatory in production — fail fast if missing
  if (!notifSecret) {
    res.status(503).json({
      error: "ORANGE_MONEY_NOTIF_SECRET n'est pas configuré. Le webhook ne peut pas être vérifié. Configurez ce secret avant d'activer les paiements en production.",
    });
    return;
  }

  // 2. Get Orange Money access token
  const tokenResult = await new Promise<{ access_token: string } | null>((resolve) => {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const postData    = querystring.stringify({ grant_type: "client_credentials" });

    const tokenReq = https.request(
      {
        hostname: "api.orange.com",
        path:     "/oauth/v3/token",
        method:   "POST",
        headers:  {
          "Authorization":  `Basic ${credentials}`,
          "Content-Type":   "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (tokenRes) => {
        let data = "";
        tokenRes.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        tokenRes.on("end", () => {
          try { resolve(JSON.parse(data) as { access_token: string }); }
          catch { resolve(null); }
        });
      }
    );
    tokenReq.on("error", () => resolve(null));
    tokenReq.write(postData);
    tokenReq.end();
  });

  if (!tokenResult?.access_token) {
    res.status(502).json({ error: "Impossible d'obtenir un token Orange Money" });
    return;
  }

  // 3. Initiate Orange Money WebPay payment
  const paymentPayload = JSON.stringify({
    merchant_key: merchantKey,
    currency:     "OUV",
    order_id:     invoiceId,
    amount:       Number(invoice.amount),
    return_url:   returnUrl,
    cancel_url:   cancelUrl,
    notif_url:    notifUrl,
    lang:         "fr",
    reference:    `SmartOrder-${invoiceId.slice(0, 8)}`,
  });

  const paymentResult = await new Promise<{ payment_url?: string; message?: string } | null>((resolve) => {
    const payReq = https.request(
      {
        hostname: "api.orange.com",
        path:     "/orange-money-webpay/ci/v1/webpayment",
        method:   "POST",
        headers:  {
          "Authorization":  `Bearer ${tokenResult.access_token}`,
          "Content-Type":   "application/json",
          "Content-Length": Buffer.byteLength(paymentPayload),
        },
      },
      (payRes) => {
        let data = "";
        payRes.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        payRes.on("end", () => {
          try { resolve(JSON.parse(data) as { payment_url?: string; message?: string }); }
          catch { resolve(null); }
        });
      }
    );
    payReq.on("error", () => resolve(null));
    payReq.write(paymentPayload);
    payReq.end();
  });

  if (!paymentResult?.payment_url) {
    const errorMsg = paymentResult?.message ?? "Erreur lors de la création du paiement Orange Money";
    console.error("[admin/pay-online] Orange Money error:", errorMsg);
    res.status(502).json({ error: errorMsg });
    return;
  }

  // 4. Save the payment_url on the invoice for reference
  await supabase.from("invoices").update({
    payment_provider: "orange_money",
    payment_url:      paymentResult.payment_url,
  }).eq("id", invoiceId);

  res.json({ paymentUrl: paymentResult.payment_url });
});

export default router;

