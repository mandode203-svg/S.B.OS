
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  TrendingUp, ShoppingBag, Users, Star,
  ChevronRight, CheckCircle2, XCircle,
  MessageCircle, Smartphone, Mail, Wifi, WifiOff,
  X, Zap, CreditCard, Bot, ChevronLeft,
} from "lucide-react";
import { Link } from "wouter";
import type { Socket } from "socket.io-client";
import { createSocket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/usePlan";
import { Button } from "@/components/ui/button";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RecentOrder {
  id: string;
  clientName: string;
  total: number;
  status: string;
  createdAt: string;
  orderType: string;
}

interface DashboardData {
  todayRevenue: number;
  todayOrders: number;
  totalClients: number;
  loyaltyRate: number;
  recentOrders: RecentOrder[];
}

interface LogEntry {
  id: string;
  order_id: string | null;
  channel: "whatsapp" | "sms" | "email";
  recipient: string;
  message: string;
  status: "sent" | "failed";
  created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  reçue:          { label: "Reçue",          color: "bg-blue-500/15 text-blue-400" },
  confirmée:      { label: "Confirmée",      color: "bg-yellow-500/15 text-yellow-400" },
  en_preparation: { label: "En préparation", color: "bg-orange-500/15 text-orange-400" },
  prête:          { label: "Prête",          color: "bg-green-500/15 text-green-400" },
  en_livraison:   { label: "En livraison",   color: "bg-purple-500/15 text-purple-400" },
  livrée:         { label: "Livrée",         color: "bg-muted text-muted-foreground" },
  annulée:        { label: "Annulée",        color: "bg-destructive/15 text-destructive" },
  new:            { label: "Nouvelle",       color: "bg-blue-500/15 text-blue-400" },
  pending:        { label: "En attente",     color: "bg-yellow-500/15 text-yellow-400" },
};

const CHANNEL_ICON = {
  whatsapp: MessageCircle,
  sms:      Smartphone,
  email:    Mail,
};

const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: "text-green-500",
  sms:      "text-blue-400",
  email:    "text-violet-400",
};

// ─── Animated counter hook ──────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 600): number {
  const [displayed, setDisplayed] = useState(target);
  const prevRef   = useRef(target);
  const rafRef    = useRef<number | null>(null);
  const startRef  = useRef<number | null>(null);

  useEffect(() => {
    if (prevRef.current === target) return;
    const from = prevRef.current;
    prevRef.current = target;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const pct = Math.min((ts - startRef.current) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setDisplayed(from + (target - from) * ease);
      if (pct < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return displayed;
}

// ─── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({
  label, rawValue, icon: Icon, color, format,
}: {
  label: string;
  rawValue: number;
  icon: React.ElementType;
  color: string;
  format: (n: number) => string;
}) {
  const animated = useAnimatedNumber(rawValue);
  const [flash, setFlash] = useState(false);
  const prevVal = useRef(rawValue);

  useEffect(() => {
    if (prevVal.current === rawValue) return;
    prevVal.current = rawValue;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 800);
    return () => clearTimeout(t);
  }, [rawValue]);

  return (
    <div className={cn(
      "bg-card border border-border rounded p-4 transition-all duration-300",
      flash && "border-primary/50 shadow-sm shadow-primary/10"
    )}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={cn("text-xl font-serif font-bold transition-all duration-150", flash && "text-primary")}>
        {format(animated)}
      </p>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { token, business } = useAuth();
  const { toast } = useToast();
  const plan = usePlan();

  const [data, setData]               = useState<DashboardData | null>(null);
  const [logs, setLogs]               = useState<LogEntry[]>([]);
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [connected, setConnected]     = useState(false);
  const [pulse, setPulse]             = useState(false);
  const [showBanner, setShowBanner]   = useState(false);

  // ── Bandeau IA journalier ────────────────────────────────────────────────────
  const [aiInsights, setAiInsights]     = useState<string[]>([]);
  const [aiIdx, setAiIdx]               = useState(0);
  const [showAiBanner, setShowAiBanner] = useState(true);
  const aiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const socketRef       = useRef<Socket | null>(null);
  const logsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoadingMain(true);
    try {
      const res = await fetch("/api/reports/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData(await res.json());
        setLastRefresh(new Date());
        setPulse(true);
        setTimeout(() => setPulse(false), 700);
      }
    } finally {
      if (!silent) setLoadingMain(false);
    }
  }, [token]);

  const fetchLogs = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoadingLogs(true);
    try {
      const res = await fetch("/api/store/communication-logs?limit=5&page=1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json() as { logs: LogEntry[] };
        setLogs(d.logs ?? []);
      }
    } finally {
      if (!silent) setLoadingLogs(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
    fetchLogs();
    mainIntervalRef.current = setInterval(() => fetchDashboard(true), 30_000);
    logsIntervalRef.current = setInterval(() => fetchLogs(true), 30_000);
    return () => {
      if (mainIntervalRef.current) clearInterval(mainIntervalRef.current);
      if (logsIntervalRef.current) clearInterval(logsIntervalRef.current);
    };
  }, [fetchDashboard, fetchLogs]);

  // ── Génération bandeau IA journalier ─────────────────────────────────────────
  useEffect(() => {
    if (!data || !business?.name) return;

    const insights: string[] = [];
    const { todayRevenue, todayOrders, totalClients, loyaltyRate } = data;

    if (todayOrders === 0) {
      insights.push(`🌅 Bonne journée ${business.name} ! Aucune commande pour l'instant — partagez votre lien de commande sur WhatsApp pour démarrer.`);
    } else {
      insights.push(`📊 Aujourd'hui : ${todayOrders} commande${todayOrders > 1 ? "s" : ""} · ${formatFCFA(todayRevenue)} de CA · Continuez sur cette lancée !`);
    }

    if (loyaltyRate > 30) {
      insights.push(`⭐ Excellent ! ${loyaltyRate.toFixed(0)}% de vos clients reviennent — votre fidélisation est au-dessus de la moyenne.`);
    } else if (loyaltyRate < 15 && totalClients > 5) {
      insights.push(`💡 Astuce : votre taux de fidélité est de ${loyaltyRate.toFixed(0)}%. Lancez une campagne de relance WhatsApp pour réactiver vos ${totalClients} clients.`);
    }

    if (todayRevenue > 0 && todayOrders > 0) {
      const avgBasket = todayRevenue / todayOrders;
      insights.push(`🛒 Panier moyen du jour : ${formatFCFA(Math.round(avgBasket))}. Pour l'augmenter, proposez des offres groupées ou des produits complémentaires.`);
    }

    insights.push(`🤖 Votre assistant IA est prêt. Posez-lui une question sur votre activité → SmartOrder AI → Assistant Business`);

    setAiInsights(insights);
    setAiIdx(0);

    // Rotation automatique toutes les 6 secondes
    if (aiTimerRef.current) clearInterval(aiTimerRef.current);
    aiTimerRef.current = setInterval(() => {
      setAiIdx(i => (i + 1) % insights.length);
    }, 6000);

    return () => { if (aiTimerRef.current) clearInterval(aiTimerRef.current); };
  }, [data, business?.name]);

  useEffect(() => {
    if (!business?.id) return;
    if (plan.isInTrial) {
      const key = `smartorder_trial_banner_dismissed_${business.id}`;
      if (localStorage.getItem(key) !== "true") setShowBanner(true);
    }
  }, [business?.id, plan.isInTrial]);

  const dismissBanner = () => {
    if (business?.id) {
      localStorage.setItem(`smartorder_trial_banner_dismissed_${business.id}`, "true");
    }
    setShowBanner(false);
  };

  useEffect(() => {
    if (!business?.id) return;
    const socket = createSocket();
    socketRef.current = socket;
    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect", () => { socket.emit("join", business.id); });
    socket.on("order:new", (order: RecentOrder) => {
      fetchDashboard(true); fetchLogs(true);
      toast({
        title: "🛎️ Nouvelle commande !",
        description: order?.clientName
          ? `${order.clientName} — ${formatFCFA(order.total ?? 0)}`
          : "Une nouvelle commande vient d'arriver.",
      });
    });
    socket.on("order:updated", () => { fetchDashboard(true); });
    socket.on("stats:refresh",  () => { fetchDashboard(true); });
    socket.on("reservation:new", (r: { clientName?: string; dateTime?: string; partySize?: number }) => {
      fetchDashboard(true);
      const dt = r?.dateTime ? new Date(r.dateTime) : null;
      const dtStr = dt
        ? dt.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
            + " à " + dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "";
      toast({
        title: "📅 Nouvelle réservation !",
        description: r?.clientName
          ? `${r.clientName}${dtStr ? " · " + dtStr : ""}${r?.partySize ? " · " + r.partySize + " pers." : ""}`
          : "Une nouvelle réservation vient d'arriver.",
      });
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [business?.id, fetchDashboard, fetchLogs, toast]);

  const kpis = data ? [
    { label: "CA aujourd'hui",   rawValue: data.todayRevenue,  icon: TrendingUp, color: "text-primary",    format: (n: number) => formatFCFA(Math.round(n)) },
    { label: "Commandes du jour", rawValue: data.todayOrders,  icon: ShoppingBag, color: "text-blue-400",  format: (n: number) => Math.round(n).toString() },
    { label: "Clients total",     rawValue: data.totalClients, icon: Users,       color: "text-green-400", format: (n: number) => Math.round(n).toString() },
    { label: "Taux fidélité",     rawValue: data.loyaltyRate,  icon: Star,        color: "text-yellow-400", format: (n: number) => `${n.toFixed(1)}%` },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {showBanner && plan.isInTrial && (
          <div className="relative bg-primary/8 border border-primary/25 rounded-xl px-5 py-4 flex gap-4 items-start">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-1">
                ⚡ Vous êtes en période d'essai gratuit ({plan.trialDaysLeft} jour{plan.trialDaysLeft > 1 ? "s" : ""} restant{plan.trialDaysLeft > 1 ? "s" : ""})
              </p>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Profitez de l'assistant virtuel intelligent et de toutes nos fonctionnalités Premium !
                Pour pérenniser votre activité et débloquer toutes les limites, découvrez nos offres d'abonnement.
              </p>
              <Link href="/dashboard/abonnement" onClick={dismissBanner}>
                <Button size="sm" className="h-8 text-xs gap-2">
                  <CreditCard className="w-3.5 h-3.5" />
                  Découvrir les offres 💳
                </Button>
              </Link>
            </div>
            <button
              onClick={dismissBanner}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Bandeau IA journalier ─────────────────────────────────────── */}
        {showAiBanner && aiInsights.length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="flex-1 text-xs text-foreground leading-relaxed animate-in fade-in duration-500" key={aiIdx}>
              {aiInsights[aiIdx]}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setAiIdx(i => (i - 1 + aiInsights.length) % aiInsights.length)}
                className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <span className="text-[10px] text-muted-foreground tabular-nums">{aiIdx + 1}/{aiInsights.length}</span>
              <button
                onClick={() => setAiIdx(i => (i + 1) % aiInsights.length)}
                className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => setShowAiBanner(false)}
                className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors ml-1"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            {/* Points de navigation */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
              {aiInsights.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setAiIdx(i)}
                  className={cn("w-1 h-1 rounded-full transition-all", i === aiIdx ? "bg-primary w-3" : "bg-primary/30")}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-serif font-semibold">
              Bonjour, {business?.name} 👋
            </h2>
            <p className="text-sm text-muted-foreground">
              Voici le résumé de votre activité aujourd'hui.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] shrink-0">
            {connected ? (
              <span className="flex items-center gap-1.5 text-green-400">
                <span className={cn("w-2 h-2 rounded-full bg-green-500", pulse ? "animate-ping" : "opacity-80")} />
                <Wifi className="w-3 h-3" />
                <span className="hidden sm:inline text-muted-foreground">
                  En direct · {timeAgo(lastRefresh.toISOString())}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <WifiOff className="w-3 h-3" />
                <span className="hidden sm:inline">Reconnexion…</span>
              </span>
            )}
          </div>
        </div>

        {loadingMain ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-card border border-border rounded p-4 animate-pulse h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Dernières commandes</h3>
              </div>
              <Link href="/dashboard/commandes" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Tout voir <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {loadingMain ? (
              <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
            ) : !data?.recentOrders.length ? (
              <div className="flex-1 flex items-center justify-center py-10 text-muted-foreground text-sm">Aucune commande pour l'instant</div>
            ) : (
              <div className="divide-y divide-border flex-1">
                {data.recentOrders.slice(0, 5).map(order => {
                  const s = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-muted text-muted-foreground" };
                  return (
                    <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{order.clientName}</p>
                        <p className="text-[11px] text-muted-foreground">{timeAgo(order.createdAt)} · {order.orderType}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium whitespace-nowrap ${s.color}`}>{s.label}</span>
                      <span className="text-sm font-semibold text-primary whitespace-nowrap">{formatFCFA(order.total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Dernières notifications</h3>
              </div>
              <Link href="/dashboard/logs" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Tout voir <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {loadingLogs ? (
              <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
            ) : logs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-10 text-muted-foreground text-sm">Aucune notification envoyée</div>
            ) : (
              <div className="divide-y divide-border flex-1">
                {logs.map(log => {
                  const Icon = CHANNEL_ICON[log.channel] ?? MessageCircle;
                  return (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                      <div className={cn("mt-0.5 p-1.5 rounded-full bg-muted flex-shrink-0", CHANNEL_COLOR[log.channel])}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{log.recipient}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-1">{log.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {log.status === "failed"
                          ? <XCircle className="w-3.5 h-3.5 text-destructive" />
                          : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(log.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
      }
