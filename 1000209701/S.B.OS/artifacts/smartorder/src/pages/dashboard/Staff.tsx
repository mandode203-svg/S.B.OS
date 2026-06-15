import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Trash2, Users2, TrendingUp, CheckCircle2, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatFCFA } from "@/lib/utils";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Order {
  id: string;
  assignedStaffId?: string | null;
  status: string;
  total: number;
  createdAt: string;
}

interface StaffStats {
  total: number;
  completed: number;
  active: number;
  cancelled: number;
  revenue: number;
  completionRate: number;
  rating: "excellent" | "bon" | "améliorer" | "nouveau";
}

const ROLES = [
  { value: "manager",   label: "Manager" },
  { value: "serveur",   label: "Serveur / Serveuse" },
  { value: "caissier",  label: "Caissier / Caissière" },
  { value: "cuisinier", label: "Cuisinier / Cuisinière" },
  { value: "livreur",   label: "Livreur / Livreuse" },
  { value: "hôte",      label: "Hôte / Hôtesse d'accueil" },
];

const RATING_CONFIG = {
  excellent:  { label: "Excellent",    bg: "bg-green-500/15",  text: "text-green-400",  icon: "⭐" },
  bon:        { label: "Bon",          bg: "bg-blue-500/15",   text: "text-blue-400",   icon: "👍" },
  améliorer:  { label: "À améliorer",  bg: "bg-orange-500/15", text: "text-orange-400", icon: "📈" },
  nouveau:    { label: "Nouveau",      bg: "bg-muted",         text: "text-muted-foreground", icon: "🆕" },
};

const EMPTY = { name: "", email: "", role: "serveur" };

function computeStats(memberId: string, orders: Order[]): StaffStats {
  const assigned = orders.filter(o => o.assignedStaffId === memberId);
  const completed = assigned.filter(o => o.status === "livrée").length;
  const cancelled = assigned.filter(o => o.status === "annulée").length;
  const active = assigned.filter(o => !["livrée", "annulée"].includes(o.status)).length;
  const revenue = assigned.filter(o => o.status === "livrée").reduce((s, o) => s + o.total, 0);
  const doneOrCancelled = completed + cancelled;
  const completionRate = doneOrCancelled > 0 ? Math.round((completed / doneOrCancelled) * 100) : 0;

  let rating: StaffStats["rating"] = "nouveau";
  if (assigned.length >= 5) {
    if (completionRate >= 85 && completed >= 5) rating = "excellent";
    else if (completionRate >= 65 || completed >= 3) rating = "bon";
    else rating = "améliorer";
  }

  return { total: assigned.length, completed, active, cancelled, revenue, completionRate, rating };
}

function StatPill({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded bg-background/50 min-w-0">
      <span className={`text-lg font-bold font-serif leading-tight ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5 text-center">{label}</span>
    </div>
  );
}

export default function Staff() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"list" | "perf">("perf");

  const fetchAll = () => {
    Promise.all([
      fetch("/api/staff", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([s, o]) => {
      setStaff(s);
      setOrders(o);
      setLoading(false);
    });
  };

  useEffect(() => { fetchAll(); }, [token]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.email || !form.role) {
      toast({ title: "Erreur", description: "Tous les champs sont requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast({ title: "Membre ajouté" });
      setOpen(false);
      setForm(EMPTY);
      fetchAll();
    } else {
      const d = await res.json();
      toast({ title: "Erreur", description: d.error, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce membre ?")) return;
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { setStaff(s => s.filter(m => m.id !== id)); toast({ title: "Membre supprimé" }); }
  };

  const getRoleLabel = (r: string) => ROLES.find(x => x.value === r)?.label ?? r;

  const totalAssigned = orders.filter(o => o.assignedStaffId).length;
  const totalCompleted = orders.filter(o => o.assignedStaffId && o.status === "livrée").length;

  const statsPerMember = staff.map(m => ({ member: m, stats: computeStats(m.id, orders) }))
    .sort((a, b) => b.stats.completed - a.stats.completed);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 bg-card border border-border rounded overflow-hidden text-xs">
            <button
              onClick={() => setTab("perf")}
              className={`px-3 py-1.5 transition-colors font-medium ${tab === "perf" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Performance
            </button>
            <button
              onClick={() => setTab("list")}
              className={`px-3 py-1.5 transition-colors font-medium ${tab === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Liste
            </button>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-card border border-border rounded animate-pulse" />)}</div>
        ) : staff.length === 0 ? (
          <div className="py-24 text-center">
            <Users2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun membre du personnel</p>
          </div>
        ) : tab === "perf" ? (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded p-3 text-center">
                <p className="text-2xl font-bold font-serif text-primary">{staff.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Membres</p>
              </div>
              <div className="bg-card border border-border rounded p-3 text-center">
                <p className="text-2xl font-bold font-serif text-blue-400">{totalAssigned}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Commandes assignées</p>
              </div>
              <div className="bg-card border border-border rounded p-3 text-center">
                <p className="text-2xl font-bold font-serif text-green-400">{totalCompleted}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Complétées</p>
              </div>
            </div>

            {/* Per-member performance cards */}
            <div className="space-y-2">
              {statsPerMember.map(({ member, stats }, rank) => {
                const rc = RATING_CONFIG[stats.rating];
                const isOpen = expanded === member.id;
                return (
                  <div key={member.id} className="bg-card border border-border rounded overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                      onClick={() => setExpanded(isOpen ? null : member.id)}
                    >
                      {/* Rank */}
                      <div className="w-6 text-center text-xs font-bold text-muted-foreground/40 flex-shrink-0">
                        {stats.completed > 0 ? `#${rank + 1}` : "—"}
                      </div>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{member.name.charAt(0).toUpperCase()}</span>
                      </div>

                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{getRoleLabel(member.role)}</p>
                      </div>

                      {/* Quick stats */}
                      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          {stats.completed} terminées
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-400" />
                          {stats.active} en cours
                        </span>
                      </div>

                      {/* Rating badge */}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ${rc.bg} ${rc.text}`}>
                        {rc.icon} {rc.label}
                      </span>

                      <span className={`text-muted-foreground text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                    </button>

                    {/* Expanded performance detail */}
                    {isOpen && (
                      <div className="border-t border-border px-4 py-4 bg-background/30 space-y-4">
                        {/* Stat pills */}
                        <div className="flex flex-wrap gap-2">
                          <StatPill value={stats.total} label="Assignées" color="text-foreground" />
                          <StatPill value={stats.completed} label="Terminées" color="text-green-400" />
                          <StatPill value={stats.active} label="En cours" color="text-blue-400" />
                          <StatPill value={stats.cancelled} label="Annulées" color="text-red-400" />
                          <StatPill value={`${stats.completionRate}%`} label="Taux compl." color="text-primary" />
                          <StatPill value={formatFCFA(stats.revenue)} label="CA généré" color="text-primary" />
                        </div>

                        {/* Completion rate bar */}
                        {stats.total > 0 && (
                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                              <span>Taux de complétion</span>
                              <span className="font-medium text-foreground">{stats.completionRate}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${stats.completionRate}%`,
                                  background: stats.completionRate >= 85
                                    ? "#22C55E"
                                    : stats.completionRate >= 65
                                    ? "#3B82F6"
                                    : "#F97316",
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Rating explanation */}
                        <div className={`rounded p-2.5 text-xs ${rc.bg} ${rc.text}`}>
                          <span className="font-semibold">{rc.icon} {rc.label} : </span>
                          {stats.rating === "excellent" && "Taux de complétion ≥ 85 % et au moins 5 commandes terminées."}
                          {stats.rating === "bon" && "Bonne activité avec un taux de complétion correct."}
                          {stats.rating === "améliorer" && "Des commandes en suspens ou annulées réduisent le score."}
                          {stats.rating === "nouveau" && "Pas encore assez de commandes assignées pour évaluer."}
                        </div>

                        {/* No orders hint */}
                        {stats.total === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            Assignez des commandes à ce membre depuis la page <span className="text-primary">Commandes</span>.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* List tab — simple roster */
          <div className="bg-card border border-border rounded divide-y divide-border overflow-hidden">
            {staff.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                <div className="w-9 h-9 rounded bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">{m.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{getRoleLabel(m.role)}</span>
                <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add member dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Ajouter un membre</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nom complet *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Rôle *</Label>
              <Select value={form.role} onValueChange={v => set("role", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Ajout..." : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
