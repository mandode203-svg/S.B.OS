import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import {
  Plus, Search, CalendarRange, ChevronLeft, ChevronRight,
  Users, Clock, MapPin, Phone, MessageSquare, CheckCircle2,
  XCircle, LayoutGrid, List, Calendar, Loader2, UserCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Socket } from "socket.io-client";
import { createSocket } from "@/lib/socket";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reservation {
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

type ViewMode = "week" | "day" | "list";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  { value: "pending",   label: "En attente",  short: "Attente",  color: "#EAB308", badge: "bg-yellow-500/15 text-yellow-400", border: "border-yellow-500/40" },
  { value: "confirmed", label: "Confirmée",   short: "Confirmée",color: "#22C55E", badge: "bg-green-500/15 text-green-400",   border: "border-green-500/40"  },
  { value: "arrived",   label: "Arrivée",     short: "Arrivée",  color: "#3B82F6", badge: "bg-blue-500/15 text-blue-400",     border: "border-blue-500/40"   },
  { value: "completed", label: "Terminée",    short: "Terminée", color: "#6B7280", badge: "bg-muted text-muted-foreground",   border: "border-muted"         },
  { value: "cancelled", label: "Annulée",     short: "Annulée",  color: "#EF4444", badge: "bg-red-500/15 text-red-400",       border: "border-red-500/40"    },
];

const NEXT_ACTION: Record<string, { status: string; label: string }> = {
  pending:   { status: "confirmed", label: "Confirmer la réservation" },
  confirmed: { status: "arrived",   label: "Marquer comme arrivée"    },
  arrived:   { status: "completed", label: "Terminer la réservation"  },
};

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAY_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

const EMPTY_FORM = {
  clientName: "", clientPhone: "", dateTime: "", partySize: "2",
  tableOrRoom: "", depositAmount: "0", notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSt(v: string) { return STATUSES.find(s => s.value === v) ?? STATUSES[0]; }

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtShortDate(d: Date) {
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()].slice(0, 3)}.`;
}

// ─── ReservationCard ──────────────────────────────────────────────────────────

function ResCard({
  r, selected, onClick,
}: { r: Reservation; selected: boolean; onClick: () => void }) {
  const st = getSt(r.status);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg px-2 py-1.5 text-xs transition-all hover:brightness-110 border ${selected ? "ring-1 ring-[#E8A325]" : ""}`}
      style={{ background: `${st.color}18`, borderColor: `${st.color}35` }}
    >
      <div className="font-semibold truncate leading-tight">{fmtTime(r.dateTime)} · {r.clientName}</div>
      <div className="text-[10px] opacity-70 mt-0.5 flex items-center gap-1">
        <Users className="w-2.5 h-2.5" />{r.partySize}
        {r.tableOrRoom && <><MapPin className="w-2.5 h-2.5 ml-1" />{r.tableOrRoom}</>}
      </div>
    </button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function ReservationDetail({
  r, onClose, onUpdateStatus, moving,
}: {
  r: Reservation;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  moving: boolean;
}) {
  const st   = getSt(r.status);
  const next = NEXT_ACTION[r.status];
  const isDone = r.status === "completed" || r.status === "cancelled";
  const dt = new Date(r.dateTime);
  const dateStr = dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="w-72 bg-[#1A1814] border border-border rounded-lg flex flex-col overflow-hidden flex-shrink-0">
      <div className="h-1 flex-shrink-0" style={{ background: st.color }} />
      <div className="flex items-start justify-between px-4 pt-4 pb-3 flex-shrink-0 border-b border-border">
        <div className="min-w-0">
          <h3 className="font-semibold font-serif truncate">{r.clientName}</h3>
          <a href={`tel:${r.clientPhone}`} className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 hover:text-[#E8A325] transition-colors">
            <Phone className="w-3 h-3" />{r.clientPhone}
          </a>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="bg-background/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="capitalize leading-tight">{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-semibold text-[#E8A325]">{fmtTime(r.dateTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span>{r.partySize} personne{r.partySize > 1 ? "s" : ""}</span>
          </div>
          {r.tableOrRoom && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span>{r.tableOrRoom}</span>
            </div>
          )}
          {r.depositAmount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs">Acompte</span>
              <span className="text-green-400 font-semibold text-xs">{formatFCFA(r.depositAmount)}</span>
            </div>
          )}
        </div>
        {r.notes && (
          <div className="flex gap-2 bg-background/50 rounded-lg p-3">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground italic leading-relaxed">{r.notes}</p>
          </div>
        )}
        <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg text-center ${st.badge} border ${st.border}`}>
          {st.label}
        </div>
        {!isDone && next && (
          <button
            disabled={moving}
            onClick={() => onUpdateStatus(r.id, next.status)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: `${getSt(next.status).color}20`,
              color: getSt(next.status).color,
              border: `1px solid ${getSt(next.status).color}40`,
            }}
          >
            {moving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {next.label}
          </button>
        )}
        {!isDone && (
          <button
            disabled={moving}
            onClick={() => onUpdateStatus(r.id, "cancelled")}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 py-2 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" /> Annuler la réservation
          </button>
        )}
        {isDone && (
          <div className={`text-sm text-center py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${st.badge}`}>
            {r.status === "completed"
              ? <><CheckCircle2 className="w-4 h-4" /> Réservation terminée</>
              : <><XCircle className="w-4 h-4" /> Réservation annulée</>
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Week Calendar ────────────────────────────────────────────────────────────

function WeekCalendar({
  reservations, weekStart, selected, onSelect,
}: {
  reservations: Reservation[];
  weekStart: Date;
  selected: Reservation | null;
  onSelect: (r: Reservation) => void;
}) {
  const today = isoDate(new Date());
  return (
    <div className="flex gap-2 flex-1 min-h-0 overflow-x-auto">
      {DAYS_FR.map((dayName, i) => {
        const day    = addDays(weekStart, i);
        const dayKey = isoDate(day);
        const dayRes = reservations
          .filter(r => r.dateTime.startsWith(dayKey))
          .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
        const isToday = dayKey === today;
        return (
          <div key={dayKey} className="flex-1 min-w-[120px] flex flex-col gap-1.5">
            <div className={`text-center py-2 rounded-lg text-xs font-semibold ${isToday ? "bg-[#E8A325]/15 text-[#E8A325] border border-[#E8A325]/30" : "bg-muted/40 text-muted-foreground"}`}>
              <div>{dayName}</div>
              <div className={`text-base font-bold mt-0.5 ${isToday ? "text-[#E8A325]" : "text-foreground"}`}>
                {day.getDate()}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[120px] p-1 bg-card/30 rounded-lg border border-border/40">
              {dayRes.length === 0 ? (
                <div className="h-full flex items-center justify-center py-4">
                  <span className="text-[10px] text-muted-foreground/40">—</span>
                </div>
              ) : dayRes.map(r => (
                <ResCard key={r.id} r={r} selected={selected?.id === r.id} onClick={() => onSelect(r)} />
              ))}
            </div>
            {dayRes.length > 0 && (
              <div className="text-center text-[10px] text-muted-foreground">
                {dayRes.length} rés.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Day Timeline ─────────────────────────────────────────────────────────────

function DayTimeline({
  reservations, selectedDay, selected, onSelect,
}: {
  reservations: Reservation[];
  selectedDay: Date;
  selected: Reservation | null;
  onSelect: (r: Reservation) => void;
}) {
  const dayKey = isoDate(selectedDay);
  const dayRes = reservations
    .filter(r => r.dateTime.startsWith(dayKey))
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-0">
        {DAY_HOURS.map(hour => {
          const slotRes = dayRes.filter(r => new Date(r.dateTime).getHours() === hour);
          return (
            <div key={hour} className="flex gap-3 min-h-[52px]">
              <div className="w-12 flex-shrink-0 text-xs text-muted-foreground pt-3 text-right">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="flex-1 border-t border-border/30 pt-2 pb-1 space-y-1">
                {slotRes.map(r => (
                  <ResCard key={r.id} r={r} selected={selected?.id === r.id} onClick={() => onSelect(r)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Reservations() {
  const { token, business } = useAuth();
  const { toast } = useToast();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [view, setView]                 = useState<ViewMode>("week");
  const [weekStart, setWeekStart]       = useState<Date>(() => getMondayOf(new Date()));
  const [selectedDay, setSelectedDay]   = useState<Date>(new Date());
  const [selected, setSelected]         = useState<Reservation | null>(null);
  const [movingIds, setMovingIds]       = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchReservations = async () => {
    const res = await fetch("/api/reservations", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setReservations(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchReservations(); }, [token]);

  useEffect(() => {
    if (!business?.id) return;
    const socket = createSocket();
    socketRef.current = socket;
    socket.emit("join", business.id);

    socket.on("reservation:new", (r: Reservation) => {
      setReservations(prev => {
        const exists = prev.find(x => x.id === r.id);
        return exists ? prev : [...prev, r].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
      });
      toast({ title: "📅 Nouvelle réservation !", description: `${r.clientName} · ${fmtTime(r.dateTime)}` });
    });

    socket.on("reservation:updated", (updated: Reservation) => {
      setReservations(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelected(prev => prev?.id === updated.id ? updated : prev);
      setMovingIds(prev => { const s = new Set(prev); s.delete(updated.id); return s; });
    });

    return () => { socket.disconnect(); };
  }, [business?.id]);

  const updateStatus = async (id: string, status: string) => {
    setMovingIds(prev => new Set([...prev, id]));
    const statusLabel = getSt(status).label;
    const res = await fetch(`/api/reservations/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated: Reservation = await res.json();
      setReservations(prev => prev.map(r => r.id === id ? updated : r));
      setSelected(prev => prev?.id === id ? updated : prev);
      toast({ title: `Statut : ${statusLabel}` });
    }
    setMovingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.clientName || !form.clientPhone || !form.dateTime) {
      toast({ title: "Erreur", description: "Nom, téléphone et date requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName:    form.clientName,
        clientPhone:   form.clientPhone,
        dateTime:      form.dateTime,
        partySize:     Number(form.partySize) || 1,
        tableOrRoom:   form.tableOrRoom || undefined,
        depositAmount: Number(form.depositAmount) || 0,
        notes:         form.notes || undefined,
      }),
    });
    if (res.ok) {
      const created: Reservation = await res.json();
      setReservations(prev => [...prev, created].sort((a, b) => a.dateTime.localeCompare(b.dateTime)));
      setFormOpen(false);
      setForm(EMPTY_FORM);
      toast({ title: "Réservation créée", description: `${created.clientName} · ${fmtTime(created.dateTime)}` });
    } else {
      const d = await res.json();
      toast({ title: "Erreur", description: d.error, variant: "destructive" });
    }
    setSaving(false);
  };

  const filtered = reservations.filter(r =>
    !search ||
    r.clientName.toLowerCase().includes(search.toLowerCase()) ||
    r.clientPhone.includes(search)
  );

  const weekLabel = (() => {
    const end = addDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth())
      return `${weekStart.getDate()}–${end.getDate()} ${MONTHS_FR[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    return `${fmtShortDate(weekStart)} – ${fmtShortDate(end)} ${end.getFullYear()}`;
  })();

  const pendingCount = reservations.filter(r => r.status === "pending").length;
  const todayCount   = reservations.filter(r => r.dateTime.startsWith(isoDate(new Date())) && !["completed", "cancelled"].includes(r.status)).length;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 h-full">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="pl-9" />
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
              <Clock className="w-3 h-3" /> {pendingCount} en attente
            </div>
          )}
          {todayCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#E8A325] bg-[#E8A325]/10 px-3 py-1.5 rounded-full border border-[#E8A325]/20">
              <UserCheck className="w-3 h-3" /> {todayCount} aujourd'hui
            </div>
          )}
          <div className="flex rounded overflow-hidden border border-border">
            {([["week", LayoutGrid, "Semaine"], ["day", Calendar, "Jour"], ["list", List, "Liste"]] as const).map(([v, Icon, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${view === v ? "bg-[#E8A325] text-black font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-2" size="sm">
            <Plus className="w-4 h-4" /> Nouvelle
          </Button>
        </div>

        {(view === "week" || view === "day") && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (view === "week") setWeekStart(d => addDays(d, -7));
                  else setSelectedDay(d => addDays(d, -1));
                }}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted border border-border transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (view === "week") setWeekStart(d => addDays(d, 7));
                  else setSelectedDay(d => addDays(d, 1));
                }}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted border border-border transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium capitalize">
                {view === "week"
                  ? weekLabel
                  : selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            </div>
            <button
              onClick={() => {
                const today = new Date();
                if (view === "week") setWeekStart(getMondayOf(today));
                else setSelectedDay(today);
              }}
              className="text-xs text-[#E8A325] hover:underline"
            >
              Aujourd'hui
            </button>
          </div>
        )}

        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : view === "week" ? (
              <WeekCalendar reservations={filtered} weekStart={weekStart} selected={selected} onSelect={setSelected} />
            ) : view === "day" ? (
              <DayTimeline reservations={filtered} selectedDay={selectedDay} selected={selected} onSelect={setSelected} />
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col flex-1">
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wide flex-shrink-0">
                  <span>Client</span>
                  <span>Date & heure</span>
                  <span>Pers.</span>
                  <span>Statut</span>
                  <span>Action</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-border/50">
                  {filtered.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center gap-3">
                      <CalendarRange className="w-8 h-8 text-muted-foreground opacity-40" />
                      <p className="text-muted-foreground text-sm">Aucune réservation</p>
                    </div>
                  ) : filtered.map(r => {
                    const st   = getSt(r.status);
                    const next = NEXT_ACTION[r.status];
                    const isDone = ["completed", "cancelled"].includes(r.status);
                    return (
                      <div
                        key={r.id}
                        className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer ${selected?.id === r.id ? "bg-muted/40" : ""}`}
                        onClick={() => setSelected(r)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.clientName}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.clientPhone}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.dateTime).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} {fmtTime(r.dateTime)}
                        </span>
                        <span className="text-xs text-center">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{r.partySize}</span>
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${st.badge}`}>
                          {st.short}
                        </span>
                        <div onClick={e => e.stopPropagation()}>
                          {!isDone && next ? (
                            <button
                              disabled={movingIds.has(r.id)}
                              onClick={() => updateStatus(r.id, next.status)}
                              className="text-xs px-2.5 py-1 rounded-md font-semibold transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                              style={{ background: `${getSt(next.status).color}20`, color: getSt(next.status).color }}
                            >
                              {next.label.split(" ")[0]}
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
          </div>

          {selected && (
            <ReservationDetail
              r={selected}
              onClose={() => setSelected(null)}
              onUpdateStatus={updateStatus}
              moving={movingIds.has(selected.id)}
            />
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Nouvelle réservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nom du client *</Label>
                <Input value={form.clientName} onChange={e => setF("clientName", e.target.value)} placeholder="Mamadou Diallo" className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Téléphone *</Label>
                <Input value={form.clientPhone} onChange={e => setF("clientPhone", e.target.value)} placeholder="+221 77…" className="mt-1 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date & heure *</Label>
                <Input type="datetime-local" value={form.dateTime} onChange={e => setF("dateTime", e.target.value)} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Nombre de personnes</Label>
                <Input type="number" min={1} value={form.partySize} onChange={e => setF("partySize", e.target.value)} className="mt-1 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Table / Espace</Label>
                <Input value={form.tableOrRoom} onChange={e => setF("tableOrRoom", e.target.value)} placeholder="Table 5, Terrasse…" className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Acompte (FCFA)</Label>
                <Input type="number" value={form.depositAmount} onChange={e => setF("depositAmount", e.target.value)} className="mt-1 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setF("notes", e.target.value)} placeholder="Allergies, demandes spéciales…" rows={2} className="mt-1 text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Enregistrement…" : "Créer la réservation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
