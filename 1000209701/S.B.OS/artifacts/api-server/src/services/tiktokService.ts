/**
 * TikTok Live Commerce Service
 *
 * Listens to a TikTok Live stream via the `tiktok-live-connector` npm package
 * (https://www.npmjs.com/package/tiktok-live-connector).
 *
 * Installation note: this package requires `tiktok-live-connector` to be
 * installed in the runtime environment. In environments where it is blocked
 * (e.g. by a package firewall), the service gracefully degrades — all other
 * functionality (order creation, WhatsApp notification) remains intact.
 *
 * To install:  pnpm add tiktok-live-connector --filter @workspace/api-server
 * Required SQL: supabase/migrations/20260604_tiktok_columns.sql
 */

import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { sendWhatsApp } from "./whatsappService.js";
import { logger } from "../lib/logger.js";

// ─── Minimal type for tiktok-live-connector ───────────────────────────────────

interface TikTokChatData {
  uniqueId: string;
  nickname: string;
  comment: string;
}

interface TikTokConnection {
  connect(): Promise<unknown>;
  disconnect(): void;
  on(event: "chat", listener: (data: TikTokChatData) => void): this;
  on(event: "disconnect" | "connect", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this;
}

/** Load WebcastPushConnection at runtime (avoids hard compile-time dep) */
async function loadWebcastPushConnection(): Promise<
  (new (username: string, options?: Record<string, unknown>) => TikTokConnection) | null
> {
  try {
    // Dynamic import — works whether the package is CJS or ESM
    const mod = await import("tiktok-live-connector" as string) as {
      WebcastPushConnection?: unknown;
      default?: { WebcastPushConnection?: unknown } | unknown;
    };
    const ctor =
      (mod as { WebcastPushConnection?: unknown }).WebcastPushConnection ??
      (mod.default as { WebcastPushConnection?: unknown })?.WebcastPushConnection ??
      mod.default;
    if (typeof ctor === "function") {
      return ctor as new (username: string, options?: Record<string, unknown>) => TikTokConnection;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Regex helpers ────────────────────────────────────────────────────────────

// Product code: uppercase letter + 1-9 uppercase letters/digits (total 2-10 chars)
const CODE_REGEX = /\b([A-Z][A-Z0-9]{1,9})\b/g;
// Phone: optional leading + followed by 8-14 digits
const PHONE_REGEX = /(\+?[0-9]{8,14})/;

function extractCodes(text: string): string[] {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  CODE_REGEX.lastIndex = 0;
  while ((m = CODE_REGEX.exec(text)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

function extractPhone(text: string): string | null {
  const m = text.match(PHONE_REGEX);
  return m ? m[1] : null;
}

// ─── Active connections map ───────────────────────────────────────────────────

interface ActiveSession {
  connection: TikTokConnection;
  username: string;
  startedAt: Date;
}

const activeSessions = new Map<string, ActiveSession>();

// ─── Comment processor ────────────────────────────────────────────────────────

async function processComment(
  storeId: string,
  comment: string,
  commenterName: string
): Promise<void> {
  const phone = extractPhone(comment);
  if (!phone) return;

  const codes = extractCodes(comment);
  if (codes.length === 0) return;

  // Fetch store products with tiktok_code set
  const { data: storeProducts, error: prodError } = await supabase
    .from("products")
    .select("id, name, price, tiktok_code")
    .eq("store_id", storeId)
    .eq("is_available", true)
    .not("tiktok_code", "is", null);

  if (prodError || !storeProducts || storeProducts.length === 0) return;

  // Find first code in the comment that matches a product
  let matchedProduct: { id: string; name: string; price: number; tiktok_code: string } | null = null;
  for (const code of codes) {
    const found = storeProducts.find(
      (p) => (p.tiktok_code as string).toUpperCase() === code
    );
    if (found) {
      matchedProduct = found as { id: string; name: string; price: number; tiktok_code: string };
      break;
    }
  }

  if (!matchedProduct) return;

  logger.info(
    { storeId, phone, product: matchedProduct.name, commenter: commenterName },
    "[TikTok] Valid order comment detected"
  );

  // Fetch store info for WhatsApp notification
  const { data: store } = await supabase
    .from("stores")
    .select("id, business_name, payment_config")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) return;

  const storeName = (store.business_name as string) ?? "notre boutique";
  const payConfig = (store.payment_config as Record<string, unknown>) ?? {};
  const payInstructions =
    (payConfig.instructions as string | null) ??
    "Veuillez nous contacter pour les modalités de paiement.";

  const price = matchedProduct.price;
  const depositAmount = Math.round(price * 0.3);

  // 1. Create order
  const orderId = randomUUID();
  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    store_id: storeId,
    customer_name: commenterName || "Client TikTok",
    customer_phone: phone,
    total_amount: price,
    deposit_amount: depositAmount,
    order_status: "en attente",
    items: [{ name: matchedProduct.name, qty: 1, price }],
    delivery_info: {
      type: "tiktok-live",
      notes: `Commande via TikTok Live – code produit : ${matchedProduct.tiktok_code}`,
    },
  });

  if (orderError) {
    logger.error({ error: orderError.message }, "[TikTok] Failed to create order");
    return;
  }

  // 2. Create AI session at awaiting_deposit state
  const { error: sessionError } = await supabase.from("ai_sessions").insert({
    id: randomUUID(),
    store_id: storeId,
    customer_phone: phone,
    current_state: "awaiting_deposit",
    chat_history: [],
  });

  if (sessionError) {
    logger.warn({ error: sessionError.message }, "[TikTok] Failed to create ai_session");
  }

  // 3. Send WhatsApp confirmation to customer
  const message =
    `Bonjour ! Vous avez manifesté de l'intérêt pour le produit *${matchedProduct.name}* ` +
    `(${price.toLocaleString("fr-FR")} FCFA) lors de notre Live TikTok ${storeName}.\n\n` +
    `Pour réserver votre article et valider la commande, veuillez régler l'acompte de ` +
    `*${depositAmount.toLocaleString("fr-FR")} FCFA*.\n\n` +
    `Voici nos instructions de paiement :\n${payInstructions}`;

  await sendWhatsApp({
    storeId,
    orderId,
    recipientPhone: phone,
    message,
  });

  logger.info(
    { storeId, orderId, phone, product: matchedProduct.name },
    "[TikTok] Order created and WhatsApp notification sent"
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface TikTokStatus {
  connected: boolean;
  username?: string;
  startedAt?: string;
}

export async function startLive(storeId: string): Promise<{ ok: boolean; error?: string }> {
  // 1. Fetch tiktok_username from store
  const { data: store } = await supabase
    .from("stores")
    .select("tiktok_username")
    .eq("id", storeId)
    .maybeSingle();

  const username = store?.tiktok_username as string | null | undefined;
  if (!username) {
    return { ok: false, error: "Aucun nom d'utilisateur TikTok configuré pour cette boutique." };
  }

  if (activeSessions.has(storeId)) {
    return { ok: false, error: "Une connexion TikTok Live est déjà active." };
  }

  // 2. Load connector package at runtime
  const WebcastPushConnection = await loadWebcastPushConnection();
  if (!WebcastPushConnection) {
    return {
      ok: false,
      error:
        "Le paquet tiktok-live-connector n'est pas disponible dans cet environnement. " +
        "Installez-le avec : pnpm add tiktok-live-connector --filter @workspace/api-server",
    };
  }

  try {
    const connection = new WebcastPushConnection(username, {
      processInitialData: false,
      enableWebsocketUpgrade: true,
    });

    connection.on("chat", (data: TikTokChatData) => {
      const text = data.comment?.trim() ?? "";
      if (text) {
        processComment(storeId, text, data.nickname ?? data.uniqueId ?? "").catch((err: Error) => {
          logger.error({ err: err.message }, "[TikTok] processComment error");
        });
      }
    });

    connection.on("disconnect", () => {
      logger.info({ storeId, username }, "[TikTok] Disconnected");
      activeSessions.delete(storeId);
    });

    connection.on("error", (err: Error) => {
      logger.error({ storeId, err: err.message }, "[TikTok] Connection error");
      activeSessions.delete(storeId);
    });

    await connection.connect();

    activeSessions.set(storeId, { connection, username, startedAt: new Date() });
    logger.info({ storeId, username }, "[TikTok] Live listener started");

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ storeId, username, err: msg }, "[TikTok] Failed to connect");
    return { ok: false, error: msg };
  }
}

export function stopLive(storeId: string): { ok: boolean; error?: string } {
  const session = activeSessions.get(storeId);
  if (!session) {
    return { ok: false, error: "Aucune connexion TikTok Live active pour cette boutique." };
  }

  try {
    session.connection.disconnect();
  } catch {
    // ignore disconnect errors
  }
  activeSessions.delete(storeId);
  logger.info({ storeId }, "[TikTok] Live listener stopped");
  return { ok: true };
}

export function getLiveStatus(storeId: string): TikTokStatus {
  const session = activeSessions.get(storeId);
  if (!session) return { connected: false };
  return {
    connected: true,
    username: session.username,
    startedAt: session.startedAt.toISOString(),
  };
}

export function getAllActiveSessions(): Array<{ storeId: string; username: string; startedAt: string }> {
  return Array.from(activeSessions.entries()).map(([storeId, s]) => ({
    storeId,
    username: s.username,
    startedAt: s.startedAt.toISOString(),
  }));
}
