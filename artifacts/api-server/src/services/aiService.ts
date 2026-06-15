import { supabase } from "../lib/supabase.js";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROQ_KEY   = process.env.GROQ_API_KEY;
const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY;

if (!GEMINI_KEY && !GROQ_KEY) {
  console.warn("[aiService] No AI key found (GEMINI_API_KEY or GROQ_API_KEY). AI features will be disabled.");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiSession {
  id: string;
  store_id: string;
  customer_phone: string;
  current_state: string;
  chat_history: ChatMessage[];
}

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  product_id?: string;
  _flag?: string;
}

interface OrderPayload {
  store_id: string;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  total_amount: number;
  deposit_amount: number;
  payment_status: string;
  order_status: string;
  delivery_info: Record<string, unknown>;
}

// ─── AI Caller ────────────────────────────────────────────────────────────────

async function callAI(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  if (GROQ_KEY)   return callGroq(messages, systemPrompt);
  if (GEMINI_KEY) return callGemini(messages, systemPrompt);
  return "Service IA temporairement indisponible. Veuillez contacter l'établissement directement.";
}

async function callGemini(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[aiService] Gemini error:", err);
    throw new Error("Gemini API error");
  }

  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Je n'ai pas pu générer de réponse.";
}

async function callGroq(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const body = {
    model: "llama3-8b-8192",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 512,
  };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[aiService] Groq error:", err);
    throw new Error("Groq API error");
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "Je n'ai pas pu générer de réponse.";
}

// ─── FedaPay — Generate payment link for deposit ─────────────────────────────

async function createFedaPayLink(params: {
  orderId: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  storeName: string;
}): Promise<string | null> {
  if (!FEDAPAY_SECRET || params.amount <= 0) return null;

  const appDomain = process.env.APP_DOMAIN ??
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://smartorder.app");

  try {
    // Step 1: Create the transaction
    const createRes = await fetch("https://api.fedapay.com/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FEDAPAY_SECRET}`,
      },
      body: JSON.stringify({
        amount:      params.amount,
        currency:    { iso: "XOF" },
        description: `Acompte commande SmartOrder — ${params.storeName}`,
        callback_url: `${appDomain}/api/payments/webhook/fedapay`,
        customer:    {
          firstname: params.customerName.split(" ")[0] ?? params.customerName,
          lastname:  params.customerName.split(" ").slice(1).join(" ") || "",
          phone_number: { number: params.customerPhone.replace(/\D/g, ""), country: "BJ" },
        },
        custom_metadata: {
          order_id:  params.orderId,
          store_id:  params.storeId,
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[aiService] FedaPay create error:", errText);
      return null;
    }

    const createData = await createRes.json() as { v1?: { transaction?: { id?: number } }; id?: number };
    const txnId = createData?.v1?.transaction?.id ?? (createData as Record<string, unknown>)?.id;

    if (!txnId) {
      console.error("[aiService] FedaPay: no transaction id in response");
      return null;
    }

    // Step 2: Get the checkout token/URL
    const tokenRes = await fetch(`https://api.fedapay.com/v1/transactions/${txnId}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FEDAPAY_SECRET}`,
      },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[aiService] FedaPay token error:", errText);
      return null;
    }

    const tokenData = await tokenRes.json() as { url?: string; token?: string };
    return tokenData.url ?? null;
  } catch (err) {
    console.error("[aiService] FedaPay error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(
  storeInfo: { business_name: string; category: string },
  catalog: CatalogProduct[],
): string {
  const catalogText =
    catalog.length > 0
      ? catalog
          .filter((p) => p.is_available)
          .map((p) => `- ${p.name} : ${p.price} FCFA`)
          .join("\n")
      : "Catalogue non disponible.";

  return `Tu es l'assistant IA de "${storeInfo.business_name}", un(e) ${storeInfo.category}.
Tu aides les clients à passer leurs commandes, faire des réservations et obtenir des informations.
Réponds toujours en français de manière chaleureuse et professionnelle.

Voici les produits disponibles aujourd'hui :
${catalogText}

Lorsque le client est prêt à commander, résume sa commande clairement avec les articles et le total.
Demande toujours un acompte de 30% du total pour confirmer la commande.
Si tu détectes une commande confirmée, inclus dans ta réponse un bloc JSON entre balises <<<ORDER>>> et <<<END_ORDER>>> comme ceci :
<<<ORDER>>>
{"customer_name":"NomClient","items":[{"name":"Article","qty":1,"price":5000}],"total_amount":5000,"deposit_amount":1500}
<<<END_ORDER>>>`;
}

// ─── Session management ────────────────────────────────────────────────────────

async function getOrCreateSession(storeId: string, customerPhone: string): Promise<AiSession> {
  const { data: existing } = await supabase
    .from("ai_sessions")
    .select("*")
    .eq("store_id", storeId)
    .eq("customer_phone", customerPhone)
    .maybeSingle();

  if (existing) return existing as AiSession;

  const { data: created, error } = await supabase
    .from("ai_sessions")
    .insert({
      store_id:       storeId,
      customer_phone: customerPhone,
      current_state:  "greeting",
      chat_history:   [],
    })
    .select()
    .single();

  if (error || !created) throw new Error(`Failed to create AI session: ${error?.message}`);
  return created as AiSession;
}

async function updateSession(
  sessionId: string,
  currentState: string,
  chatHistory: ChatMessage[]
): Promise<void> {
  await supabase
    .from("ai_sessions")
    .update({ current_state: currentState, chat_history: chatHistory })
    .eq("id", sessionId);
}

// ─── Order extraction ─────────────────────────────────────────────────────────

function extractOrder(aiResponse: string): Record<string, unknown> | null {
  const match = aiResponse.match(/<<<ORDER>>>([\s\S]*?)<<<END_ORDER>>>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ─── Catalog validation ────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/[\s\-_]+/g, " ");
}

function findProductMatch(itemName: string, catalog: CatalogProduct[]): CatalogProduct | null {
  const needle = normalize(itemName);
  const exact  = catalog.find((p) => normalize(p.name) === needle);
  if (exact) return exact;
  const partial = catalog.find(
    (p) => normalize(p.name).includes(needle) || needle.includes(normalize(p.name))
  );
  return partial ?? null;
}

async function fetchCatalog(storeId: string): Promise<CatalogProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, is_available")
    .eq("store_id", storeId);

  if (error) {
    console.warn("[aiService] Could not fetch catalog:", error.message);
    return [];
  }
  return (data ?? []) as CatalogProduct[];
}

function validateItems(
  rawItems: Record<string, unknown>[],
  catalog: CatalogProduct[]
): OrderItem[] {
  return rawItems.map((raw) => {
    const name = String(raw.name ?? "Article inconnu");
    const qty  = Number(raw.qty ?? 1);
    const match = findProductMatch(name, catalog);

    if (!match) {
      return { name, qty, price: 0, _flag: "Produit inconnu - À tarifer manuellement" };
    }
    return { name: match.name, qty, price: match.price, product_id: match.id };
  });
}

async function createOrderFromAI(
  storeId: string,
  customerPhone: string,
  orderData: Record<string, unknown>,
  catalog: CatalogProduct[],
  storeName: string,
): Promise<{ orderId: string | null; paymentLink: string | null }> {
  const rawItems       = (orderData.items as Record<string, unknown>[]) ?? [];
  const validatedItems = validateItems(rawItems, catalog);

  const computedTotal = validatedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const hasUnknown    = validatedItems.some((i) => i._flag !== undefined);
  const totalAmount   = hasUnknown
    ? computedTotal
    : ((orderData.total_amount as number) ?? computedTotal);

  // Deposit is 30% of total (or AI-provided value if > 0)
  const aiDeposit = (orderData.deposit_amount as number) ?? 0;
  const depositAmount = aiDeposit > 0 ? aiDeposit : Math.round(totalAmount * 0.3);

  const customerName = (orderData.customer_name as string) ?? "Client IA";

  const payload: OrderPayload = {
    store_id:       storeId,
    customer_name:  customerName,
    customer_phone: customerPhone,
    items:          validatedItems,
    total_amount:   totalAmount,
    deposit_amount: depositAmount,
    payment_status: "pending",
    order_status:   "new",
    delivery_info:  {},
  };

  const { data, error } = await supabase.from("orders").insert(payload).select("id").single();
  if (error) {
    console.error("[aiService] Failed to create order:", error.message);
    return { orderId: null, paymentLink: null };
  }

  const orderId = (data as { id: string }).id;

  // Generate FedaPay payment link for the deposit
  let paymentLink: string | null = null;
  if (depositAmount > 0) {
    paymentLink = await createFedaPayLink({
      orderId,
      storeId,
      customerName,
      customerPhone,
      amount: depositAmount,
      storeName,
    });
  }

  return { orderId, paymentLink };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function processMessage(
  storeId: string,
  customerPhone: string,
  userMessage: string
): Promise<{ reply: string; orderCreated: boolean; orderId: string | null; paymentLink: string | null }> {
  const [storeRes, catalog] = await Promise.all([
    supabase
      .from("stores")
      .select("business_name, category")
      .eq("id", storeId)
      .maybeSingle(),
    fetchCatalog(storeId),
  ]);

  const storeRow = storeRes.data as { business_name: string; category: string } | null;
  const storeInfo  = storeRow ?? { business_name: "SmartOrder", category: "établissement" };
  const storeName  = storeInfo.business_name;

  const systemPrompt = buildSystemPrompt(storeInfo, catalog);

  const session  = await getOrCreateSession(storeId, customerPhone);
  const history: ChatMessage[] = Array.isArray(session.chat_history) ? session.chat_history : [];

  history.push({ role: "user", content: userMessage });

  const aiReply = await callAI(history, systemPrompt);
  history.push({ role: "assistant", content: aiReply });

  const newState = aiReply.includes("<<<ORDER>>>") ? "order_confirmed" : "in_progress";
  await updateSession(session.id, newState, history);

  let orderCreated = false;
  let orderId: string | null = null;
  let paymentLink: string | null = null;

  const orderData = extractOrder(aiReply);
  if (orderData) {
    const result = await createOrderFromAI(storeId, customerPhone, orderData, catalog, storeName);
    orderId      = result.orderId;
    paymentLink  = result.paymentLink;
    if (orderId) orderCreated = true;
  }

  let cleanReply = aiReply.replace(/<<<ORDER>>>[\s\S]*?<<<END_ORDER>>>/g, "").trim();

  // Append FedaPay payment link to the reply
  if (paymentLink && orderCreated) {
    const deposit = Number((orderData?.deposit_amount as number) ?? 0) ||
      Math.round(Number((orderData?.total_amount as number) ?? 0) * 0.3);
    cleanReply += `\n\n💳 Voici le lien sécurisé pour régler votre acompte de ${deposit.toLocaleString("fr-FR")} FCFA :\n${paymentLink}\n\nVous pouvez payer par Mobile Money (MTN, Moov) ou Wave. Votre commande sera confirmée dès réception du paiement.`;
  }

  return { reply: cleanReply, orderCreated, orderId, paymentLink };
}

export async function resetSession(storeId: string, customerPhone: string): Promise<void> {
  await supabase
    .from("ai_sessions")
    .delete()
    .eq("store_id", storeId)
    .eq("customer_phone", customerPhone);
}
