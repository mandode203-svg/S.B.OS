import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA, formatDateTime } from "@/lib/utils";
import {
  Search, LayoutGrid, List, RefreshCw, Clock, Zap,
  UserCheck, ChevronRight, CheckCircle2, XCircle, Phone,
  MessageSquare, ChefHat, Package, Bike, Utensils,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Socket } from "socket.io-client";
import { createSocket } from "@/lib/socket";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember { id: string; name: string; role: string; }

interface Order {
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
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FLOW = [
  { value: "reçue",          label: "Reçue",          short: "Reçue",    color: "#3B82F6", badge: "bg-blue-500/15 text-blue-400",     border: "border-blue-500"   },
  { value: "confirmée",      label: "Confirmée",      short: "Confirmer",color: "#EAB308", badge: "bg-yellow-500/15 text-yellow-400", border: "border-yellow-500" },
  { value: "en_preparation", label: "En préparation", short: "Préparer", color: "#F97316", badge: "bg-orange-500/15 text-orange-400", border: "border-orange-500" },
  { value: "prête",          label: "Prête",          short: "Prête",    color: "#22C55E", badge: "bg-green-500/15 text-green-400",   border: "border-green-500"  },
  { value: "livrée",         label: "Livrée",         short: "Livrer",   color: "#E8A325", badge: "bg-amber-500/15 text-amber-400",   border: "border-amber-500"  },
  { value: "annulée",        label: "Annulée",        short: "Annuler",  color: "#EF4444", badge: "bg-red-500/15 text-red-400",       border: "border-red-500"    },
];

const KANBAN_COLS = STATUS_FLOW.filter(s => s.value !== "annulée").concat(
  STATUS_FLOW.filter(s => s.value === "annulée")
);

const ORDER_TYPE_LABELS: Record<string, string> = {
  "dine-in":  "Sur place",
  takeaway:   "À emporter",
  delivery:   "Livraison",
  preorder:   "Pré-commande",
};

const ORDER_TYPE_ICONS: Record<string, React.ElementType> = {
  "dine-in":  Utensils,
  takeaway:   Package,
  delivery:   Bike,
  preorder:   Clock,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(v: string) { return STATUS_FLOW.find(s => s.value === v) ?? STATUS_FLOW[0]; }

function nextStatus(current: string): string | null {
  const flow = ["reçue", "confirmée", "en_preparation", "prête", "livrée"];
  const idx = flow.indexOf(current);
  if (idx < 0 || idx >= flow.length - 1) return null;
  return flow[idx + 1];
}

function minutesAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  return `${Math.floor(hrs / 24)} j`;
}

const NEXT_LABEL: Record<string, string> = {
  reçue:          "Confirmer",
  confirmée:      "En préparation",
  en_preparation: "Marquer prête",
  prête:          "Livrée ✓",
};

// ─── KanbanCard ───────────────────────────────────────────────────────────────

function KanbanCard({
  order, onSelect, onMove, isNew, moving,
}: {
  order: Order;
  onSelect: (o: Order) => void;
  onMove: (id: string, status: string) => void;
  isNew: boolean;
  moving: boolean;
}) {
  const st     = getStatus(order.status);
  const next   = nextStatus(order.status);
  const isDone = ["livrée", "annulée"].includes(order.status);
  const TypeIcon = ORDER_TYPE_ICONS[order.orderType] ?? Utensils;

  return (
    <div
      className={`bg-[#1A1814] border border-border rounded-lg overflow-hidden cursor-pointer transition-all hover:border-[#E8A325]/40 ${isNew ? "ring-1 ring-[#E8A325]" : ""}`}
      onClick={() => onSelect(order)}
    >
      <div className="h-0.5 w-full" style={{ background: st.color, opacity: 0.7 }} />
      <div className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{order.clientName}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <TypeIcon className="w-3 h-3 flex-shrink-0" />
              <span>{ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-[#E8A325]">{formatFCFA(order.total)}</p>
            <p className="text-xs text-muted-foreground">{minutesAgo(order.createdAt)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {order.items.map(i => `${i.quantity}× ${i.name}`).join(" · ")}
        </p>
        {!isDone && (
          <div className="flex gap-1.5 pt-0.5" onClick={e => e.stopPropagation()}>
            {next && (
              <button
                disabled={moving}
                onClick={() => onMove(order.id, next)}
                className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-md transition-all active:scale-95 disabled:opacity-50"
                style={{ background: `${getStatus(next).color}20`, color: getStatus(next).color }}
              >
                <ChevronRight className="w-3.5 h-3.5" />
                {NEXT_LABEL[order.status] ?? "Avancer"}
              </button>
            )}
            <button
              disabled={moving}
              onClick={() => onMove(order.id, "annulée")}
              className="w-8 flex items-center justify-center text-xs py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
              title="Annuler la commande"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {isDone && (
          <div className={`text-xs text-center py-1 rounded font-medium ${st.badge}`}>
            {st.label}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OrderDetail ──────────────────────────────────────────────────────────────

function OrderDetail({
  order, staff, onClose, onMove, onAssign, moving,
}: {
  order: Order;
  staff: StaffMember[];
  onClose: () => void;
  onMove: (id: string, status: string) => void;
  onAssign: (orderId: string, staffId: string | null) => void;
  moving: boolean;
}) {
  const next   = nextStatus(order.status);
  const st     = getStatus(order.status);
  const isDone = ["livrée", "annulée"].includes(order.status);
  const assignedMember = staff.find(s => s.id === order.assignedStaffId);
  const TypeIcon = ORDER_TYPE_ICONS[order.orderType] ?? Utensils;

  return (
    <div className="w-80 bg-[#1A1814] border border-border rounded-lg flex flex-col overflow-hidden flex-shrink-0">
      <div className="h-1 w-full flex-shrink-0" style={{ background: st.color }} />
      <div className="flex items-start justify-between px-4 pt-4 pb-3 flex-shrink-0">
        <div>
          <h3 className="font-semibold font-serif leading-tight">{order.clientName}</h3>
          <a
            href={`tel:${order.clientPhone}`}
            className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-[#E8A325] transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <Phone className="w-3 h-3" />
            {order.clientPhone}
          </a>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TypeIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</span>
          <span>·</span>
          <span>{formatDateTime(order.createdAt)}</span>
        </div>
        {!isDone && next && (
          <button
            disabled={moving}
            onClick={() => onMove(order.id, next)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: `${getStatus(next).color}20`,
              color: getStatus(next).color,
              border: `1px solid ${getStatus(next).color}40`,
            }}
          >
            <ChevronRight className="w-4 h-4" />
            {NEXT_LABEL[order.status] ?? "Avancer la commande"}
          </button>
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Progression</p>
          <div className="flex items-center gap-0.5">
            {["reçue", "confirmée", "en_preparation", "prête", "livrée"].map((s, i) => {
              const sst   = getStatus(s);
              const flow  = ["reçue", "confirmée", "en_preparation", "prête", "livrée"];
              const curIdx = flow.indexOf(order.status);
              const thisIdx = i;
              const isDoneSt = curIdx > thisIdx;
              const isActive = curIdx === thisIdx;
              return (
                <button
                  key={s}
                  disabled={moving || order.status === s}
                  onClick={() => onMove(order.id, s)}
                  title={sst.label}
                  className="flex-1 flex flex-col items-center gap-1 group disabled:cursor-default"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                    style={{
                      background: isDoneSt || isActive ? `${sst.color}25` : "rgba(255,255,255,0.04)",
                      border:     `1.5px solid ${isDoneSt || isActive ? sst.color : "rgba(255,255,255,0.1)"}`,
                      boxShadow:  isActive ? `0 0 8px ${sst.color}60` : "none",
                      color:      isDoneSt || isActive ? sst.color : "rgba(255,255,255,0.2)",
                    }}
                  >
                    {isDoneSt ? "✓" : i + 1}
                  </div>
                  <div
                    className="text-[9px] font-medium text-center leading-tight"
                    style={{ color: isActive ? sst.color : isDoneSt ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)" }}
                  >
                    {sst.short}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-background/50 rounded-lg p-3 space-y-1.5">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.quantity}× {item.name}</span>
              <span className="font-medium">{formatFCFA(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border/50 pt-2 flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span className="text-[#E8A325]">{formatFCFA(order.total)}</span>
          </div>
          {order.depositAmount > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Acompte versé</span>
              <span className="text-green-400">{formatFCFA(order.depositAmount)}</span>
            </div>
          )}
        </div>
        {order.notes && (
          <div className="flex gap-2 bg-background/50 rounded-lg p-3">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground italic leading-relaxed">{order.notes}</p>
          </div>
        )}
        {staff.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Assigné à
            </p>
            <Select
              value={order.assignedStaffId ?? "none"}
              onValueChange={v => onAssign(order.id, v === "none" ? null : v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Non assigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Non assigné</span>
                </SelectItem>
                {staff.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                    <span className="text-muted-foreground ml-1">· {m.role}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignedMember && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#E8A325]">
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                  {assignedMember.name.charAt(0)}
                </div>
                {assignedMember.name}
              </div>
            )}
          </div>
        )}
        {!isDone && (
          <button
            disabled={moving}
            onClick={() => onMove(order.id, "annulée")}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 py-2 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Annuler la commande
          </button>
        )}
        {isDone && (
          <div className={`text-sm text-center py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${st.badge}`}>
            {order.status === "livrée"
              ? <><CheckCircle2 className="w-4 h-4" /> Commande complétée</>
              : <><XCircle className="w-4 h-4" /> Commande annulée</>
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Commandes() {
  const { token, business } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders]       = useState<Order[]>([]);
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [view, setView]           = useState<"kanban" | "list">("kanban");
  const [selected, setSelected]   = useState<Order | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  const fetchOrders = async () => {
    const res = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    fetch("/api/staff", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setStaff);
  }, [token]);

  useEffect(() => {
    if (!business?.id) return;
    const socket = createSocket();
    socketRef.current = socket;
    socket.emit("join", business.id);

    socket.on("order:new", (order: Order) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === order.id);
        return exists ? prev : [order, ...prev];
      });
      setNewOrderIds(prev => new Set([...prev, order.id]));
      setTimeout(() => setNewOrderIds(prev => { const s = new Set(prev); s.delete(order.id); return s; }), 5000);
      toast({
        title: "🔔 Nouvelle commande !",
        description: `${order.clientName} · ${formatFCFA(order.total)}`,
      });
    });

    socket.on("order:updated", (updated: Order) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
      setSelected(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
      setMovingIds(prev => { const s = new Set(prev); s.delete(updated.id); return s; });
    });

    return () => { socket.disconnect(); };
  }, [business?.id]);

  const updateStatus = async (orderId: string, status: string) => {
    setMovingIds(prev => new Set([...prev, orderId]));
    const statusLabel = getStatus(status).label;
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
      setSelected(prev => prev?.id === orderId ? { ...prev, ...updated } : prev);
      toast({ title: `Statut : ${statusLabel}`, description: `Commande mise à jour · le client est notifié` });
    }
    setMovingIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
  };

  const assignOrder = async (orderId: string, staffId: string | null) => {
    const res = await fetch(`/api/orders/${orderId}/assign`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ staffId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
      setSelected(prev => prev?.id === orderId ? { ...prev, ...updated } : prev);
      const name = staff.find(s => s.id === staffId)?.name;
      toast({ title: name ? `Assigné à ${name}` : "Assignation retirée" });
    }
  };

  const filtered = orders.filter(o =>
    !search ||
    o.clientName.toLowerCase().includes(search.toLowerCase()) ||
    o.clientPhone.includes(search)
  );

  const liveOrders = filtered.filter(o => !["livrée", "annulée"].includes(o.status));
  const doneOrders = filtered.filter(o => ["livrée", "annulée"].includes(o.status));
  const liveCount  = orders.filter(o => !["livrée", "annulée"].includes(o.status)).length;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 h-full">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client…"
              className="pl-9"
            />
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#E8A325] bg-[#E8A325]/10 px-3 py-1.5 rounded-full border border-[#E8A325]/20">
              <Zap className="w-3 h-3" />
              {liveCount} en cours
            </div>
          )}
          <div className="flex rounded overflow-hidden border border-border">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${view === "kanban" ? "bg-[#E8A325] text-black font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-[#E8A325] text-black font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-3.5 h-3.5" /> Liste
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={fetchOrders} title="Rafraîchir">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          {view === "kanban" ? (
            <div className="flex-1 overflow-x-auto">
              {loading ? (
                <div className="flex gap-3 h-full">
                  {KANBAN_COLS.slice(0, 4).map(c => (
                    <div key={c.value} className="w-56 shrink-0 space-y-2">
                      <div className="h-6 bg-muted rounded animate-pulse w-24" />
                      {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-card border border-border rounded-lg animate-pulse" />)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 h-full pb-2">
                  {KANBAN_COLS.map(col => {
                    const colOrders = filtered.filter(o => o.status === col.value);
                    return (
                      <div key={col.value} className="w-56 shrink-0 flex flex-col gap-2">
                        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border-l-2 ${col.border} bg-card`}>
                          <span className="text-xs font-semibold">{col.label}</span>
                          {colOrders.length > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${col.badge}`}>
                              {colOrders.length}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                          {colOrders.length === 0 ? (
                            <div className="h-16 border border-dashed border-border/50 rounded-lg flex items-center justify-center">
                              <span className="text-xs text-muted-foreground/50">Vide</span>
                            </div>
                          ) : colOrders.map(order => (
                            <KanbanCard
                              key={order.id}
                              order={order}
                              onSelect={o => { setSelected(o); }}
                              onMove={updateStatus}
                              isNew={newOrderIds.has(order.id)}
                              moving={movingIds.has(order.id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <span>Client</span>
                <span>Type</span>
                <span className="text-right">Montant</span>
                <span>Statut</span>
                <span>Action</span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-border/50">
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
                    <ChefHat className="w-8 h-8 opacity-30" />
                    Aucune commande
                  </div>
                ) : [...liveOrders, ...doneOrders].map(order => {
                  const col  = getStatus(order.status);
                  const next = nextStatus(order.status);
                  const isDone = ["livrée", "annulée"].includes(order.status);
                  return (
                    <div
                      key={order.id}
                      className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer ${selected?.id === order.id ? "bg-muted/40" : ""} ${newOrderIds.has(order.id) ? "bg-[#E8A325]/5" : ""}`}
                      onClick={() => setSelected(order)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{order.clientName}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.clientPhone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}
                      </span>
                      <span className="text-sm font-semibold text-[#E8A325] text-right whitespace-nowrap">
                        {formatFCFA(order.total)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${col.badge}`}>
                        {col.label}
                      </span>
                      <div onClick={e => e.stopPropagation()}>
                        {!isDone && next ? (
                          <button
                            disabled={movingIds.has(order.id)}
                            onClick={() => updateStatus(order.id, next)}
                            className="text-xs px-2.5 py-1 rounded-md font-semibold transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                            style={{ background: `${getStatus(next).color}20`, color: getStatus(next).color }}
                          >
                            {NEXT_LABEL[order.status] ?? "→"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selected && (
            <OrderDetail
              order={selected}
              staff={staff}
              onClose={() => setSelected(null)}
              onMove={updateStatus}
              onAssign={assignOrder}
              moving={movingIds.has(selected.id)}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
