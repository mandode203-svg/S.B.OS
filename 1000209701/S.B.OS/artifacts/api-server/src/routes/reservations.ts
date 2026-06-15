import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { requireAuth, type AuthPayload } from "../middlewares/auth.js";
import { emitNewReservation, emitReservationUpdate } from "../lib/socket.js";
import { sendWhatsApp } from "../services/whatsappService.js";

const router: IRouter = Router();
type AuthReq = Request & { auth: AuthPayload };

// ─── Shape mapper ─────────────────────────────────────────────────────────────
interface FrontendReservation {
  id: string;
  clientName: string;
  clientPhone: string;
  dateTime: string;
  partySize: number;
  tableOrRoom: string | null;
  depositAmount: number;
  status: string;
  notes: string | null;
}

function toFrontend(row: Record<string, unknown>): FrontendReservation {
  return {
    id:            row.id as string,
    clientName:    (row.client_name as string) ?? "",
    clientPhone:   (row.client_phone as string) ?? "",
    dateTime:      (row.date_time as string) ?? "",
    partySize:     Number(row.party_size ?? 1),
    tableOrRoom:   (row.table_or_room as string) ?? null,
    depositAmount: Number(row.deposit_amount ?? 0),
    status:        (row.status as string) ?? "pending",
    notes:         (row.notes as string) ?? null,
  };
}

// ─── GET /reservations ────────────────────────────────────────────────────────
router.get("/reservations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { status, dateFrom, dateTo } = req.query as {
    status?: string; dateFrom?: string; dateTo?: string;
  };

  let query = supabase
    .from("reservations")
    .select("*")
    .eq("store_id", businessId)
    .order("date_time", { ascending: true });

  if (status)   query = query.eq("status", status);
  if (dateFrom) query = query.gte("date_time", dateFrom);
  if (dateTo)   query = query.lte("date_time", dateTo);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  res.json((data ?? []).map(r => toFrontend(r as Record<string, unknown>)));
});

// ─── POST /reservations (authenticated — merchant creates reservation) ─────────
router.post("/reservations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const { clientName, clientPhone, dateTime, partySize, tableOrRoom, depositAmount, notes } = req.body as {
    clientName: string; clientPhone: string; dateTime: string;
    partySize: number; tableOrRoom?: string; depositAmount?: number; notes?: string;
  };

  if (!clientName || !clientPhone || !dateTime || partySize == null) {
    res.status(400).json({ error: "Champs obligatoires manquants" });
    return;
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      id:            randomUUID(),
      store_id:      businessId,
      client_name:   clientName,
      client_phone:  clientPhone,
      date_time:     dateTime,
      party_size:    partySize,
      table_or_room: tableOrRoom ?? null,
      deposit_amount: depositAmount ?? 0,
      status:        "pending",
      notes:         notes ?? null,
    })
    .select()
    .single();

  if (error || !data) { res.status(500).json({ error: error?.message ?? "Erreur création" }); return; }

  const fr = toFrontend(data as Record<string, unknown>);

  // ── Post-creation async tasks (non-blocking) ────────────────────────────────
  void (async () => {
    try {
      // Fetch store name for WhatsApp message
      const { data: storeData } = await supabase
        .from("stores")
        .select("business_name")
        .eq("id", businessId)
        .maybeSingle();

      const storeName = (storeData?.business_name as string) ?? "l'établissement";
      const refId = fr.id.slice(0, 8).toUpperCase();
      const dtObj = new Date(dateTime);
      const dtFormatted = dtObj.toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long",
      });
      const timeFormatted = dtObj.toLocaleTimeString("fr-FR", {
        hour: "2-digit", minute: "2-digit",
      });

      // Notify client via WhatsApp (confirmation)
      await sendWhatsApp({
        storeId: businessId,
        orderId: null,
        recipientPhone: clientPhone,
        message:
          `🎉 *Réservation enregistrée !*\n\n` +
          `Bonjour ${clientName}, votre réservation chez *${storeName}* a bien été enregistrée.\n\n` +
          `📅 *Date :* ${dtFormatted}\n` +
          `🕐 *Heure :* ${timeFormatted}\n` +
          `👥 *Personnes :* ${partySize}\n` +
          `🔖 *Référence :* ${refId}\n\n` +
          `Notre équipe a hâte de vous accueillir ! 🙏`,
      });
    } catch (err) {
      console.warn("[reservations] WhatsApp notification failed:", err);
    }

    // Upsert client record
    try {
      const { data: existing } = await supabase
        .from("clients")
        .select("id, total_orders")
        .eq("store_id", businessId)
        .eq("phone", clientPhone)
        .maybeSingle();
      if (existing) {
        await supabase.from("clients").update({
          total_orders:  ((existing.total_orders as number) ?? 0) + 1,
          last_order_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("clients").insert({
          id:            randomUUID(),
          store_id:      businessId,
          name:          clientName,
          phone:         clientPhone,
          total_orders:  1,
          total_spent:   0,
          last_order_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[reservations] Client upsert failed:", err);
    }
  })();

  emitNewReservation(businessId, fr);
  res.status(201).json(fr);
});

// ─── POST /reservations/public — no auth (customer booking page) ─────────────
router.post("/reservations/public", async (req: Request, res: Response): Promise<void> => {
  const { storeId, clientName, clientPhone, dateTime, partySize, tableOrRoom, notes } = req.body as {
    storeId: string; clientName: string; clientPhone: string; dateTime: string;
    partySize: number; tableOrRoom?: string; notes?: string;
  };

  if (!storeId || !clientName || !clientPhone || !dateTime || partySize == null) {
    res.status(400).json({ error: "Champs obligatoires manquants" });
    return;
  }

  // Verify store exists — fetch owner_id to resolve merchant phone from user_metadata
  const { data: store } = await supabase
    .from("stores")
    .select("id, business_name, owner_id")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) { res.status(404).json({ error: "Établissement introuvable" }); return; }

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      id:            randomUUID(),
      store_id:      storeId,
      client_name:   clientName,
      client_phone:  clientPhone,
      date_time:     dateTime,
      party_size:    partySize,
      table_or_room: tableOrRoom ?? null,
      deposit_amount: 0,
      status:        "pending",
      notes:         notes ?? null,
    })
    .select()
    .single();

  if (error || !data) { res.status(500).json({ error: error?.message ?? "Erreur création" }); return; }

  const fr = toFrontend(data as Record<string, unknown>);

  // ── Post-creation async tasks (non-blocking) ────────────────────────────────
  void (async () => {
    const storeName = (store.business_name as string) ?? "l'établissement";
    const reservationId = data.id as string;
    const refId = reservationId.slice(0, 8).toUpperCase();

    // Format date/time for messages
    const dtObj = new Date(dateTime);
    const dtFormatted = dtObj.toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long",
    });
    const timeFormatted = dtObj.toLocaleTimeString("fr-FR", {
      hour: "2-digit", minute: "2-digit",
    });

    // Resolve merchant phone from Supabase Auth user_metadata
    // (phone is NOT stored as a column in the stores table — it's in user_metadata)
    let merchantPhone: string | null = null;
    try {
      const ownerId = store.owner_id as string | null;
      if (ownerId) {
        const { data: ud } = await supabase.auth.admin.getUserById(ownerId);
        merchantPhone = (ud?.user?.user_metadata?.phone as string | null) ?? null;
      }
    } catch {
      // Non-critical — proceed without merchant notification
    }

    // 1. WhatsApp → client confirmation
    await sendWhatsApp({
      storeId,
      orderId: null,
      recipientPhone: clientPhone,
      message:
        `🎉 *Réservation reçue !*\n\n` +
        `Bonjour ${clientName}, votre demande chez *${storeName}* a bien été enregistrée.\n\n` +
        `📅 *Date :* ${dtFormatted}\n` +
        `🕐 *Heure :* ${timeFormatted}\n` +
        `👥 *Personnes :* ${partySize}\n` +
        `🔖 *Référence :* ${refId}\n\n` +
        `Notre équipe vous contactera pour confirmer votre table. À bientôt ! 🙏`,
    });

    // 2. WhatsApp → merchant alert
    if (merchantPhone) {
      const notesLine = notes ? `📝 *Notes :* ${notes}\n` : "";
      await sendWhatsApp({
        storeId,
        orderId: null,
        recipientPhone: merchantPhone,
        message:
          `🔔 *Nouvelle réservation !*\n\n` +
          `👤 *Client :* ${clientName}\n` +
          `📞 *Tél. :* ${clientPhone}\n` +
          `📅 *Date :* ${dtFormatted} à ${timeFormatted}\n` +
          `👥 *Personnes :* ${partySize}\n` +
          `${notesLine}` +
          `🔖 *Réf :* ${refId}\n\n` +
          `Connectez-vous pour confirmer la réservation.`,
      });
    }

    // 3. Upsert client record
    try {
      const { data: existing } = await supabase
        .from("clients")
        .select("id, total_orders")
        .eq("store_id", storeId)
        .eq("phone", clientPhone)
        .maybeSingle();
      if (existing) {
        await supabase.from("clients").update({
          total_orders:  ((existing.total_orders as number) ?? 0) + 1,
          last_order_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("clients").insert({
          id:            randomUUID(),
          store_id:      storeId,
          name:          clientName,
          phone:         clientPhone,
          total_orders:  1,
          total_spent:   0,
          last_order_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[reservations/public] Client upsert failed:", err);
    }
  })();

  emitNewReservation(storeId, fr);
  res.status(201).json(fr);
});

// ─── PUT /reservations/:id ────────────────────────────────────────────────────
router.put("/reservations/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { businessId } = (req as AuthReq).auth;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const { data: existing } = await supabase
    .from("reservations")
    .select("id")
    .eq("id", rawId)
    .eq("store_id", businessId)
    .maybeSingle();

  if (!existing) { res.status(404).json({ error: "Réservation introuvable" }); return; }

  const body = req.body as {
    clientName?: string; clientPhone?: string; dateTime?: string;
    partySize?: number; tableOrRoom?: string; depositAmount?: number;
    notes?: string; status?: string;
  };

  const updates: Record<string, unknown> = {};
  if (body.clientName    !== undefined) updates.client_name    = body.clientName;
  if (body.clientPhone   !== undefined) updates.client_phone   = body.clientPhone;
  if (body.dateTime      !== undefined) updates.date_time      = body.dateTime;
  if (body.partySize     !== undefined) updates.party_size     = body.partySize;
  if (body.tableOrRoom   !== undefined) updates.table_or_room  = body.tableOrRoom;
  if (body.depositAmount !== undefined) updates.deposit_amount = body.depositAmount;
  if (body.notes         !== undefined) updates.notes          = body.notes;
  if (body.status        !== undefined) updates.status         = body.status;

  const { data, error } = await supabase
    .from("reservations")
    .update(updates)
    .eq("id", rawId)
    .eq("store_id", businessId)
    .select()
    .single();

  if (error || !data) { res.status(500).json({ error: error?.message ?? "Erreur mise à jour" }); return; }

  const fr = toFrontend(data as Record<string, unknown>);
  emitReservationUpdate(businessId, fr);
  res.json(fr);
});

export default router;
