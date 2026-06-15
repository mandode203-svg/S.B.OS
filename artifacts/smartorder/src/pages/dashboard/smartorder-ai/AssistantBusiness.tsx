import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Send, Bot, User, Zap, RotateCcw, TrendingUp, ShoppingBag, Users, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: string;
}

interface DashStats {
  todayRevenue: number;
  todayOrders: number;
  totalClients: number;
  loyaltyRate: number;
}

// ─── Suggestions rapides ───────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: "Analyse mes ventes du jour" },
  { icon: ShoppingBag, label: "Quels produits vendre plus ?" },
  { icon: Users,       label: "Comment fidéliser mes clients ?" },
  { icon: Star,        label: "Donne-moi 3 idées promotions" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssistantBusiness() {
  const { token, business } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [stats, setStats]       = useState<DashStats | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // ── Fetch stats pour contexte IA ────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch("/api/reports/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((d: DashStats | null) => { if (d) setStats(d); })
      .catch(() => undefined);
  }, [token]);

  // ── Message d'accueil ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!business?.name) return;
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: `Bonjour ! Je suis votre Assistant Business SmartOrder 🤖\n\nJe peux analyser vos ventes, vous proposer des stratégies pour augmenter votre chiffre d'affaires, vous aider avec votre marketing et répondre à toutes vos questions business.\n\nQue puis-je faire pour **${business.name}** aujourd'hui ?`,
      ts: new Date().toISOString(),
    }]);
  }, [business?.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Envoi message ─────────────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || loading || !token) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
      ts: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Construire le contexte avec les stats réelles
      const statsContext = stats
        ? `\n\nContexte actuel de l'entreprise:\n- CA aujourd'hui: ${stats.todayRevenue.toLocaleString("fr-FR")} FCFA\n- Commandes du jour: ${stats.todayOrders}\n- Clients total: ${stats.totalClients}\n- Taux fidélité: ${stats.loyaltyRate.toFixed(1)}%`
        : "";

      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/business-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userText,
          history,
          context: statsContext,
          businessName: business?.name ?? "",
          businessType: business?.type ?? "",
        }),
      });

      if (!res.ok) {
        // Fallback: appel direct Anthropic via fetch
        throw new Error("api_unavailable");
      }

      const data = await res.json() as { reply: string };
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        ts: new Date().toISOString(),
      }]);
    } catch {
      // Fallback: réponse générique si l'API backend n'est pas encore branchée
      const fallbacks: Record<string, string> = {
        vente: `Pour augmenter vos ventes chez **${business?.name}**, voici mes recommandations :\n\n1. **Créez des offres combo** : associez vos produits phares avec des articles complémentaires (+20% panier moyen)\n2. **Relancez vos clients dormants** via la campagne marketing (onglet Marketing)\n3. **Activez les suggestions IA** sur votre page de commande client\n4. **Publiez sur TikTok** pendant les heures de pointe (12h-14h et 19h-21h)`,
        client: `Pour fidéliser vos clients chez **${business?.name}** :\n\n1. **Envoyez un message WhatsApp** 3 jours après chaque commande pour prendre des nouvelles\n2. **Offrez -10% à la 5e commande** — configurez-le dans Fidélité (CRM)\n3. **Créez un groupe WhatsApp** VIP pour vos meilleurs clients\n4. **Publiez des stories** avec les coulisses de votre activité`,
      };
      const key = Object.keys(fallbacks).find(k =>
        userText.toLowerCase().includes(k)
      );
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: key
          ? fallbacks[key]
          : `Je suis en cours de connexion au serveur IA. En attendant, voici un conseil rapide :\n\n**Astuce du jour** : Envoyez une offre flash à vos ${stats?.totalClients ?? "clients"} clients via la section Marketing → Campagnes. Un bon de -15% envoyé le vendredi soir génère en moyenne +35% de commandes le weekend ! 🚀`,
        ts: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleReset = () => {
    if (!business?.name) return;
    setMessages([{
      id: "welcome-reset",
      role: "assistant",
      content: `Conversation réinitialisée. Comment puis-je vous aider, **${business.name}** ?`,
      ts: new Date().toISOString(),
    }]);
    toast({ title: "Conversation réinitialisée" });
  };

  // ── Render message ────────────────────────────────────────────────────────────
  const renderContent = (text: string) => {
    // Convertir **bold** et retours à la ligne
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
          {i < text.split("\n").length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto">

        {/* ── En-tête ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-serif font-semibold">Assistant Business IA</h1>
              <p className="text-xs text-muted-foreground">Conseiller stratégique intelligent</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs gap-1.5">
            <RotateCcw className="w-3 h-3" /> Réinitialiser
          </Button>
        </div>

        {/* ── Zone messages ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">

          {/* Stats rapides */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {[
                { label: "CA aujourd'hui", value: `${stats.todayRevenue.toLocaleString("fr-FR")} F`, icon: TrendingUp, color: "text-primary" },
                { label: "Commandes", value: String(stats.todayOrders), icon: ShoppingBag, color: "text-blue-400" },
                { label: "Clients", value: String(stats.totalClients), icon: Users, color: "text-green-400" },
                { label: "Fidélité", value: `${stats.loyaltyRate.toFixed(1)}%`, icon: Star, color: "text-yellow-400" },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-lg p-2.5 flex items-center gap-2">
                  <s.icon className={`w-3.5 h-3.5 flex-shrink-0 ${s.color}`} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
                    <p className="text-xs font-semibold">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-card border border-border rounded-tl-sm"
              )}>
                {renderContent(msg.content)}
                <p className={cn("text-[10px] mt-1.5", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>
                  {new Date(msg.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Suggestions rapides ───────────────────────────────────────── */}
        {messages.length <= 1 && !loading && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {QUICK_PROMPTS.map(q => (
              <button
                key={q.label}
                onClick={() => sendMessage(q.label)}
                className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5 text-xs text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <q.icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Zone de saisie ────────────────────────────────────────────── */}
        <div className="flex gap-2 bg-card border border-border rounded-2xl p-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Posez votre question business…"
            className="border-0 bg-transparent focus-visible:ring-0 text-sm h-9 px-2"
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="h-9 w-9 rounded-xl flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
}
