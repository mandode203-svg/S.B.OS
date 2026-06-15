import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA, formatDateTime } from "@/lib/utils";
import { CreditCard, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  orderId?: string | null;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
}

const METHODS = [
  { value: "espèces", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "carte", label: "Carte bancaire" },
  { value: "virement", label: "Virement" },
];

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500/15 text-green-400",
  pending: "bg-yellow-500/15 text-yellow-400",
  failed: "bg-destructive/15 text-destructive",
};

const EMPTY = { amount: "", method: "espèces", orderId: "", status: "completed" };

export default function Paiements() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchTxns = () => {
    fetch("/api/transactions", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setTransactions(d); setLoading(false); });
  };

  useEffect(() => { fetchTxns(); }, [token]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: "Erreur", description: "Montant invalide", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(form.amount), method: form.method, orderId: form.orderId || undefined, status: form.status }),
    });
    if (res.ok) {
      toast({ title: "Transaction enregistrée" });
      setOpen(false);
      setForm(EMPTY);
      fetchTxns();
    }
    setSaving(false);
  };

  const totalRevenue = transactions.filter(t => t.status === "completed").reduce((s, t) => s + t.amount, 0);

  const filtered = transactions.filter(t =>
    !search || t.method.toLowerCase().includes(search.toLowerCase()) || (t.orderId?.includes(search) ?? false)
  );

  const byMethod: Record<string, number> = {};
  transactions.filter(t => t.status === "completed").forEach(t => {
    byMethod[t.method] = (byMethod[t.method] ?? 0) + t.amount;
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 bg-card border border-border rounded p-4">
            <p className="text-xs text-muted-foreground mb-1">Total encaissé</p>
            <p className="text-2xl font-serif font-bold text-primary">{formatFCFA(totalRevenue)}</p>
          </div>
          {Object.entries(byMethod).slice(0, 2).map(([method, total]) => (
            <div key={method} className="bg-card border border-border rounded p-4">
              <p className="text-xs text-muted-foreground mb-1 capitalize">{method.replace("_", " ")}</p>
              <p className="text-lg font-serif font-bold">{formatFCFA(total)}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Enregistrer
          </Button>
        </div>

        <div className="bg-card border border-border rounded overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-border text-xs text-muted-foreground font-medium">
            <span>Date</span>
            <span>Mode de paiement</span>
            <span>Montant</span>
            <span>Statut</span>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune transaction</p>
            </div>
          ) : filtered.map(t => (
            <div key={t.id} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-border items-center">
              <span className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</span>
              <span className="text-sm capitalize">{t.method.replace("_", " ")}</span>
              <span className="text-sm font-semibold text-primary">{formatFCFA(t.amount)}</span>
              <span className={`text-xs px-2 py-0.5 rounded w-fit font-medium ${STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground"}`}>
                {t.status === "completed" ? "Complété" : t.status === "pending" ? "En attente" : "Échoué"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Montant (FCFA) *</Label>
              <Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Mode de paiement *</Label>
              <Select value={form.method} onValueChange={v => set("method", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Complété</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
