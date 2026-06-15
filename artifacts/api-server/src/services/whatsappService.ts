import { supabase } from "../lib/supabase.js";

const DEFAULT_INSTANCE = process.env.ULTRAMSG_INSTANCE ?? "";
const DEFAULT_TOKEN = process.env.ULTRAMSG_TOKEN ?? "";

// ─── Communication log ────────────────────────────────────────────────────────

async function logCommunication(params: {
  store_id: string;
  order_id: string | null;
  channel: "whatsapp" | "sms" | "email";
  recipient: string;
  message: string;
  status: "sent" | "failed";
}): Promise<void> {
  // Fire-and-forget — never let logging block the main flow
  supabase.from("communication_logs").insert(params).then(({ error }) => {
    if (error) console.error("[whatsappService] log error:", error.message);
  });
}

// ─── UltraMsg sender ──────────────────────────────────────────────────────────

interface SendResult {
  ok: boolean;
  error?: string;
}

async function ultraMsgSend(
  instance: string,
  token: string,
  phone: string,
  message: string
): Promise<SendResult> {
  if (!instance || !token) {
    return { ok: false, error: "No UltraMsg instance/token configured" };
  }

  try {
    const res = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token, to: phone, body: message }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp message for a given store.
 * Resolves the store's own UltraMsg credentials first;
 * falls back to global ULTRAMSG_INSTANCE / ULTRAMSG_TOKEN env vars if absent.
 */
export async function sendWhatsApp(params: {
  storeId: string;
  orderId: string | null;
  recipientPhone: string;
  message: string;
}): Promise<SendResult> {
  const { storeId, orderId, recipientPhone, message } = params;

  // 1. Fetch per-store credentials
  const { data: store } = await supabase
    .from("stores")
    .select("whatsapp_instance_id, whatsapp_token")
    .eq("id", storeId)
    .maybeSingle();

  const instance =
    (store?.whatsapp_instance_id as string | null) || DEFAULT_INSTANCE;
  const token =
    (store?.whatsapp_token as string | null) || DEFAULT_TOKEN;

  // 2. Send message
  const result = await ultraMsgSend(instance, token, recipientPhone, message);

  // 3. Log asynchronously (non-blocking)
  await logCommunication({
    store_id: storeId,
    order_id: orderId,
    channel: "whatsapp",
    recipient: recipientPhone,
    message,
    status: result.ok ? "sent" : "failed",
  });

  if (!result.ok) {
    console.error(`[whatsappService] Failed to send to ${recipientPhone}:`, result.error);
  }

  return result;
}

/**
 * Log any outbound communication (email, SMS, WhatsApp) from outside this service.
 * Used so that any service can record comms without coupling to the full send logic.
 */
export async function logOutbound(params: {
  store_id: string;
  order_id: string | null;
  channel: "whatsapp" | "sms" | "email";
  recipient: string;
  message: string;
  status: "sent" | "failed";
}): Promise<void> {
  await logCommunication(params);
}
