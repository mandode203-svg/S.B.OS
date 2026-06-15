import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, CheckCircle2, XCircle, MessageCircle,
  Mail, Smartphone, Loader2, Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  order_id: string | null;
  channel: "whatsapp" | "sms" | "email";
  recipient: string;
  message: string;
  status: "sent" | "failed";
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_ICONS = {
  whatsapp: MessageCircle,
  sms: Smartphone,
  email: Mail,
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "text-green-500 bg-green-500/10",
  sms: "text-blue-500 bg-blue-500/10",
  email: "text-violet-500 bg-violet-500/10",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function truncate(str: string, max = 80): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommunicationLogs() {
  const { token } = useAuth();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const LIMIT = 25;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Auto-refresh every 15 s
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(
    async (silent = false) => {
      if (!token) return;
      silent ? setRefreshing(true) : setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        channel: filterChannel,
        status: filterStatus,
      });

      try {
        const res = await fetch(`/api/store/communication-logs?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json() as { logs: LogEntry[]; total: number };
          setLogs(data.logs);
          setTotal(data.total);
        }
      } finally {
        silent ? setRefreshing(false) : setLoading(false);
      }
    },
    [token, page, filterChannel, filterStatus]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    intervalRef.current = setInterval(() => fetchLogs(true), 15_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchLogs]);

  const handleFilterChange = () => {
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-base font-semibold font-serif">Logs de communication</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historique de toutes les notifications envoyées — WhatsApp, SMS, Email.
              Actualisation automatique toutes les 15 s.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start sm:self-auto"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={filterChannel}
            onValueChange={v => { setFilterChannel(v); handleFilterChange(); }}
          >
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les canaux</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterStatus}
            onValueChange={v => { setFilterStatus(v); handleFilterChange(); }}
          >
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
            </SelectContent>
          </Select>

          {total > 0 && (
            <span className="ml-auto text-xs text-muted-foreground self-center">
              {total} notification{total > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="border border-border rounded overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[100px_1fr_130px_90px_90px] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Canal</span>
            <span>Destinataire / Message</span>
            <span>Commande</span>
            <span>Statut</span>
            <span className="text-right">Date</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement…
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Inbox className="w-8 h-8 opacity-30" />
              <p className="text-sm">Aucune notification pour l'instant</p>
              <p className="text-xs opacity-60">Les logs apparaîtront ici dès qu'une notification sera envoyée.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const Icon = CHANNEL_ICONS[log.channel] ?? MessageCircle;
                const isExpanded = expandedId === log.id;

                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    {/* Mobile layout */}
                    <div className="sm:hidden flex items-start gap-3">
                      <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 mt-0.5", CHANNEL_COLORS[log.channel])}>
                        <Icon className="w-3 h-3" />
                        {CHANNEL_LABELS[log.channel]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{log.recipient}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {isExpanded ? log.message : truncate(log.message)}
                        </p>
                      </div>
                      <span className={cn(
                        "flex items-center gap-1 text-[11px] font-medium shrink-0",
                        log.status === "sent" ? "text-green-500" : "text-destructive"
                      )}>
                        {log.status === "sent"
                          ? <CheckCircle2 className="w-3.5 h-3.5" />
                          : <XCircle className="w-3.5 h-3.5" />}
                        {log.status === "sent" ? "Envoyé" : "Échoué"}
                      </span>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:grid grid-cols-[100px_1fr_130px_90px_90px] gap-3 items-start">
                      {/* Channel */}
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium w-fit", CHANNEL_COLORS[log.channel])}>
                        <Icon className="w-3 h-3" />
                        {CHANNEL_LABELS[log.channel]}
                      </span>

                      {/* Recipient + message */}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{log.recipient}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {isExpanded ? log.message : truncate(log.message)}
                        </p>
                      </div>

                      {/* Order ID */}
                      <span className="text-[11px] text-muted-foreground font-mono truncate">
                        {log.order_id ? log.order_id.slice(0, 8) + "…" : "—"}
                      </span>

                      {/* Status */}
                      <span className={cn(
                        "flex items-center gap-1 text-[11px] font-medium",
                        log.status === "sent" ? "text-green-500" : "text-destructive"
                      )}>
                        {log.status === "sent"
                          ? <CheckCircle2 className="w-3.5 h-3.5" />
                          : <XCircle className="w-3.5 h-3.5" />}
                        {log.status === "sent" ? "Envoyé" : "Échoué"}
                      </span>

                      {/* Date */}
                      <span className="text-[11px] text-muted-foreground text-right">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline" size="sm" className="text-xs"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => p - 1)}
            >
              ← Précédent
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline" size="sm" className="text-xs"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(p => p + 1)}
            >
              Suivant →
            </Button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
