import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Plus, Trash2, PencilLine, X, Loader2, ShoppingCart, Users, Home, Truck, Megaphone, Wrench, Zap, Package } from "lucide-react";

interface Expense {
  id: string; label: string; amount: number; category: string; note?: string | null; date: string;
}

const CATEGORIES = [
  { value: "stock",          label: "Achats stock",     icon: ShoppingCart, color: "#E8A325" },
  { value: "salaires",       label: "Salaires",         icon: Users,        color: "#3B82F6" },
  { value: "loyer",          label: "Loyer",            icon: Home,         color: "#8B5CF6" },
  { value: "transport",      label: "Transport",        icon: Truck,        color: "#10B981" },
  { value: "marketing",      label: "Marketing",        icon: Megaphone,    color: "#F59E0B" },
  { value: "maintenance",    label: "Maintenance",      icon: Wrench,       color: "#EF4444" },
  { value: "eau_electricite",label: "Eau / Électricité",icon: Zap,          color: "#06B6D4" },
  { value: "autre",          label: "Autre",            icon: Package,      color: "#6B7280" },
];

const CHART_STYLE = {
  content: { background: "#1A1814", border: "1px solid hsl(40 13% 15%)", borderRadius: 6, fontSize: 11, color: "#FAF5E8" },
};

function getCatInfo(value: string) {
  return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1]!;
}

export default function Depenses() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", amount: "", category: "stock", note: "", date: new Date().toISOString().split("T")[0]! });

  const fetchExpenses = async () => {
    if (!token) return;
    const r = await fetch("/api/finance/expenses", { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setExpenses(await r.json() as Expense[]);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, [token]);

  const resetForm = () => {
    setForm({ label: "", amount: "", category: "stock", note: "", date: new Date().toISOString().split("T")[0]! });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (e: Expense) => {
    setForm({ label: e.label, amount: String(e.amount), category: e.category, note: e.note ?? "", date: e.date });
    setEditId(e.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.label || !form.amount) { toast({ title: "Champs requis", description: "Libellé et montant obligatoires", variant: "destructive" }); return; }
    setSaving(true);
    const url = editId ? `/api/finance/expenses/${editId}` : "/api/finance/expenses";
    const method = editId ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    if (r.ok) {
      toast({ title: editId ? "Dépense modifiée" : "Dépense ajoutée" });
      resetForm();
      await fetchExpenses();
    } else {
      const d = await r.json() as { error?: string };
      toast({ title: "Erreur", description: d.error, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette dépense ?")) return;
    const r = await fetch(`/api/finance/expenses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { toast({ title: "Dépense supprimée" }); setExpenses(prev => prev.filter(e => e.id !== id)); }
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Données pour le graphique camembert
  const byCategory = CATEGORIES.map(c => ({
    name: c.label, value: Math.round(expenses.filter(e => e.category === c.value).reduce((s, e) => s + e.amount, 0)), color: c.color,
  })).filter(c => c.value > 0);

  const months = [...new Set(expenses.map(e => e.date.slice(0, 7)))].slice(0, 3);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif font-semibold">Dépenses</h1>
            <p className="text-sm text-muted-foreground">Suivi et catégorisation de vos charges</p>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>

        {/* Total + graphique */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#1A1814] border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total dépenses (période)</p>
            <p className="text-3xl font-serif font-bold text-[#E8A325]">{formatFCFA(Math.round(total))}</p>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} entrée{expenses.length > 1 ? "s" : ""}</p>
            <div className="mt-4 space-y-2">
              {CATEGORIES.filter(c => expenses.some(e => e.category === c.value)).map(c => {
                const amt = expenses.filter(e => e.category === c.value).reduce((s, e) => s + e.amount, 0);
                const pct = total > 0 ? (amt / total) * 100 : 0;
                return (
                  <div key={c.value} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                    <span className="text-xs text-muted-foreground flex-1">{c.label}</span>
                    <span className="text-xs font-medium">{formatFCFA(Math.round(amt))}</span>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-[#1A1814] border border-border rounded-xl p-4 flex flex-col items-center justify-center">
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={0}>
                    {byCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART_STYLE.content} formatter={(v: number) => [formatFCFA(v)]} />
                  <Legend iconSize={8} formatter={v => <span style={{ fontSize: 10, color: "#9B9289" }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune dépense enregistrée</p>
            )}
          </div>
        </div>

        {/* Formulaire ajout/édition */}
        {showForm && (
          <div className="bg-[#1A1814] border border-[#E8A325]/30 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{editId ? "Modifier la dépense" : "Nouvelle dépense"}</h2>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Libellé *</Label>
                <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Achat légumes" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Montant (FCFA) *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Catégorie</Label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full h-8 rounded-md border border-input bg-background text-sm px-2">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs mb-1 block">Note (optionnel)</Label>
                <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Commentaire..." className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetForm}>Annuler</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editId ? "Enregistrer" : "Ajouter"}
              </Button>
            </div>
          </div>
        )}

        {/* Liste des dépenses */}
        <div className="bg-[#1A1814] border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Historique des dépenses</h2>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Aucune dépense enregistrée. Commencez par en ajouter une.</div>
          ) : (
            <div className="divide-y divide-border">
              {expenses.map(e => {
                const cat = getCatInfo(e.category);
                const Icon = cat.icon;
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cat.color}18` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.label} · {new Date(e.date).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-400">{formatFCFA(e.amount)}</span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleEdit(e)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <PencilLine className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
