import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Store, ShoppingCart, Bell, TrendingUp, Package,
  ShieldAlert, RefreshCw, LogOut, Receipt, PlusCircle, CheckCircle2,
  Clock, X, Smartphone, Wallet,
} from "lucide-react";
import { formatFCFA } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
  totalNotifications: number;
  totalRevenue: number;
  totalBilled: number;
  totalCollected: number;
}

interface Shop {
  id: string;
  name: string;
  category: string;
  plan: string;
  active: boolean;
  createdAt: string;
  ownerEmail: string;
}

interface Invoice {
  id: string;
  storeId: string;
  storeName: string;
  plan: string;
  amount: number;
  status: "pending" | "paid";
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  paymentProvider: string | null;
  paymentRef: string | null;
}

interface AdminWithdrawal {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  payoutMethod: string;
  payoutDetails: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_OPTIONS = [
  { value: "starter",  label: "Starter" },
  { value: "business", label: "Business" },
  { value: "pro",      label: "Pro / Premium" },
];

const PLAN_BADGE: Record<string, string> = {
  starter:  "bg-zinc-700 text-zinc-300",
  business: "bg-blue-900/50 text-blue-300",
  pro:      "bg-amber-900/50 text-amber-300",
};

// Default offline billing amounts (FCFA) — admin can override in the form
const DEFAULT_AMOUNTS: Record<string, number> = {
  starter:  0,
  business: 15000,
  pro:      30000,
};

// ─── AdminPanel ───────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // --- state ---
  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [shops, setShops]       = useState<Shop[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Withdrawals
  const [withdrawals, setWithdrawals]         = useState<AdminWithdrawal[]>([]);
  const [approvingWdId, setApprovingWdId]     = useState<string | null>(null);

  // Billing form state
  const [showInvForm, setShowInvForm]     = useState(false);
  const [invStoreId, setInvStoreId]       = useState("");
  const [invPlan, setInvPlan]             = useState("business");
  const [invAmount, setInvAmount]         = useState(DEFAULT_AMOUNTS.business);
  const [invNotes, setInvNotes]           = useState("");
  const [creatingInv, setCreatingInv]     = useState(false);
  const [payingInvId, setPayingInvId]     = useState<string | null>(null);
  const [payingOnlineId, setPayingOnlineId] = useState<string | null>(null);

  // --- helpers ---
  const getHeaders = (): Record<string, string> =>
    token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = useCallback(async () => {
    if (!token) { navigate("/login"); return; }
    setLoading(true);

    const [statsRes, shopsRes, invoicesRes, wdRes] = await Promise.all([
      fetch("/api/admin/stats",       { headers: getHeaders() }),
      fetch("/api/admin/shops",       { headers: getHeaders() }),
      fetch("/api/admin/invoices",    { headers: getHeaders() }),
      fetch("/api/admin/withdrawals", { headers: getHeaders() }),
    ]);

    if ([statsRes, shopsRes, invoicesRes].some(r => r.status === 403)) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if ([statsRes, shopsRes, invoicesRes].some(r => r.status === 401)) {
      navigate("/login");
      return;
    }

    if (statsRes.ok)    setStats(await statsRes.json() as AdminStats);
    if (shopsRes.ok)    setShops(await shopsRes.json() as Shop[]);
    if (invoicesRes.ok) setInvoices(await invoicesRes.json() as Invoice[]);
    if (wdRes.ok)       setWithdrawals(await wdRes.json() as AdminWithdrawal[]);
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle Orange Money return URL (?payment=success|cancelled&invoice=xxx)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const invoiceId = params.get("invoice");
    if (!payment || !invoiceId) return;

    // Clean the URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    if (payment === "success") {
      toast({ title: "✅ Paiement Orange Money confirmé — rechargement en cours…" });
      fetchData();
    } else if (payment === "cancelled") {
      toast({ title: "⚠️ Paiement annulé", variant: "destructive" });
    }
  }, []);

  // --- shop actions ---
  const handleToggle = async (shopId: string) => {
    setUpdatingId(shopId);
    const res = await fetch(`/api/admin/shops/${shopId}/toggle`, {
      method: "PUT", headers: getHeaders(),
    });
    if (res.ok) {
      const d = await res.json() as { active: boolean };
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, active: d.active } : s));
      toast({ title: d.active ? "✅ Boutique activée" : "⏸ Boutique désactivée" });
    } else {
      toast({ title: "Erreur lors du changement de statut", variant: "destructive" });
    }
    setUpdatingId(null);
  };

  const handlePlanChange = async (shopId: string, plan: string) => {
    setUpdatingId(shopId);
    const res = await fetch(`/api/admin/shops/${shopId}/plan`, {
      method: "PUT",
      headers: { ...getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      setShops(prev => prev.map(s => s.id === shopId ? { ...s, plan } : s));
      toast({ title: `Plan mis à jour : ${plan}` });
    } else {
      toast({ title: "Erreur lors du changement de plan", variant: "destructive" });
    }
    setUpdatingId(null);
  };

  // --- online payment action ---
  const handlePayOnline = async (invoiceId: string) => {
    setPayingOnlineId(invoiceId);
    const res = await fetch(`/api/admin/invoices/${invoiceId}/pay-online`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (res.ok) {
      const d = await res.json() as { paymentUrl: string };
      window.open(d.paymentUrl, "_blank", "noopener,noreferrer");
    } else {
      const err = await res.json() as { error: string };
      toast({ title: err.error ?? "Erreur lors de l'initialisation du paiement", variant: "destructive" });
    }
    setPayingOnlineId(null);
  };

  // --- invoice actions ---
  const handleCreateInvoice = async () => {
    if (!invStoreId) { toast({ title: "Sélectionnez une boutique", variant: "destructive" }); return; }
    setCreatingInv(true);
    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { ...getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: invStoreId, plan: invPlan, amount: invAmount, notes: invNotes || undefined }),
    });
    if (res.ok) {
      toast({ title: "✅ Facture créée" });
      setShowInvForm(false);
      setInvStoreId(""); setInvPlan("business"); setInvAmount(DEFAULT_AMOUNTS.business); setInvNotes("");
      await fetchData();
    } else {
      const err = await res.json() as { error: string };
      toast({ title: err.error ?? "Erreur lors de la création", variant: "destructive" });
    }
    setCreatingInv(false);
  };

  const handleApproveWithdrawal = async (wdId: string) => {
    setApprovingWdId(wdId);
    const res = await fetch(`/api/admin/withdrawals/${wdId}/approve`, {
      method: "PUT", headers: getHeaders(),
    });
    if (res.ok) {
      setWithdrawals(prev => prev.map(w => w.id === wdId ? { ...w, status: "approved", approvedAt: new Date().toISOString() } : w));
      toast({ title: "✅ Retrait approuvé" });
    } else {
      const err = await res.json() as { error?: string };
      toast({ title: err.error ?? "Erreur", variant: "destructive" });
    }
    setApprovingWdId(null);
  };

  const handlePayInvoice = async (invoiceId: string, storeName: string, plan: string) => {
    setPayingInvId(invoiceId);
    const res = await fetch(`/api/admin/invoices/${invoiceId}/pay`, {
      method: "PUT", headers: getHeaders(),
    });
    if (res.ok) {
      setInvoices(prev => prev.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: "paid", paidAt: new Date().toISOString() }
          : inv
      ));
      setShops(prev => prev.map(s => s.id === (invoices.find(i => i.id === invoiceId)?.storeId) ? { ...s, plan } : s));
      toast({ title: `✅ Facture réglée — ${storeName} passé en plan ${plan}` });
    } else {
      const err = await res.json() as { error: string };
      toast({ title: err.error ?? "Erreur", variant: "destructive" });
    }
    setPayingInvId(null);
  };

  // ─── Forbidden ──────────────────────────────────────────────────────────────
  if (forbidden) {
    return (
      <div className="min-h-screen bg-[#0B0A08] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-white mb-2">Accès Refusé</h1>
          <p className="text-white/40 text-sm mb-6">
            Vous n'avez pas les droits d'accès au panneau d'administration.
            Seul le propriétaire du SaaS peut accéder à cette page.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2 bg-primary text-[#0B0A08] font-semibold rounded-lg text-sm"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A08] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Chargement du panneau admin…</p>
        </div>
      </div>
    );
  }

  // ─── KPI cards ────────────────────────────────────────────────────────────────
  const kpis = [
    { label: "Boutiques Inscrites",   value: String(stats?.totalStores ?? 0),            icon: Store,       color: "text-amber-400",  bg: "bg-amber-900/20 border-amber-500/20" },
    { label: "Commandes Totales",     value: String(stats?.totalOrders ?? 0),             icon: ShoppingCart, color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-500/20" },
    { label: "Notifications Envoyées", value: String(stats?.totalNotifications ?? 0),    icon: Bell,        color: "text-sky-400",    bg: "bg-sky-900/20 border-sky-500/20" },
    { label: "CA Global Cumulé",      value: formatFCFA(stats?.totalRevenue ?? 0),        icon: TrendingUp,  color: "text-primary",    bg: "bg-primary/10 border-primary/20" },
  ];

  const pendingInvoices = invoices.filter(i => i.status === "pending");
  const paidInvoices    = invoices.filter(i => i.status === "paid");

  return (
    <div className="min-h-screen bg-[#0B0A08] text-white">

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/8 bg-[#0B0A08]/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-serif font-bold text-sm">
              SmartOrder <span className="text-primary">AI</span>
              <span className="ml-2 text-[10px] bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded font-sans font-semibold uppercase tracking-wide">
                Super Admin
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </button>
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 space-y-10">

        {/* ─── Title ────────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">Panneau d'Administration</h1>
          <p className="text-white/40 text-sm mt-1">
            Vue globale du SaaS · {shops.length} boutique{shops.length !== 1 ? "s" : ""} inscrite{shops.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ─── KPI Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl border p-5 ${bg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-white/40 font-medium leading-tight">{label}</p>
                <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
              </div>
              <p className={`text-2xl font-bold font-serif ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ─── Secondary stat bar ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 bg-white/3 border border-white/8 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-white/30 flex-shrink-0" />
            <p className="text-xs text-white/50">
              <span className="text-white font-semibold">{stats?.totalProducts ?? 0}</span> produit{(stats?.totalProducts ?? 0) !== 1 ? "s" : ""} référencé{(stats?.totalProducts ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="h-3 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-white/30 flex-shrink-0" />
            <p className="text-xs text-white/50">
              Facturé : <span className="text-white font-semibold">{formatFCFA(stats?.totalBilled ?? 0)}</span>
              {" "}&nbsp;·&nbsp;{" "}
              Encaissé : <span className="text-primary font-semibold">{formatFCFA(stats?.totalCollected ?? 0)}</span>
            </p>
          </div>
        </div>

        {/* ─── Shops Table ──────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-serif font-semibold text-white mb-4">Liste des boutiques</h2>
          {shops.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">Aucune boutique inscrite pour l'instant.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Boutique</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide hidden md:table-cell">Secteur</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide hidden lg:table-cell">Email gérant</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide hidden sm:table-cell">Inscription</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Forfait</th>
                    <th className="text-center px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Actif</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop, idx) => (
                    <tr key={shop.id} className={`border-b border-white/5 hover:bg-white/2 transition-colors ${idx % 2 === 0 ? "" : "bg-white/1"}`}>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-white text-sm">{shop.name}</p>
                          <p className="text-[11px] text-white/30 font-mono mt-0.5">{shop.id.slice(0, 8)}…</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-white/60 text-xs capitalize">{shop.category}</span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-white/50 text-xs">{shop.ownerEmail}</span>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-white/40 text-xs">
                          {new Date(shop.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${PLAN_BADGE[shop.plan] ?? PLAN_BADGE.starter}`}>
                            {shop.plan}
                          </span>
                          <Select value={shop.plan} onValueChange={(val) => handlePlanChange(shop.id, val)} disabled={updatingId === shop.id}>
                            <SelectTrigger className="h-7 text-[11px] w-[110px] bg-white/5 border-white/10 text-white hover:bg-white/10 focus:ring-primary/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10">
                              {PLAN_OPTIONS.map(p => (
                                <SelectItem key={p.value} value={p.value} className="text-xs text-white/80 focus:bg-primary/15 focus:text-primary">
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {updatingId === shop.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white/40 mx-auto" />
                        ) : (
                          <Switch
                            checked={shop.active}
                            onCheckedChange={() => handleToggle(shop.id)}
                            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-zinc-700 mx-auto"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Billing Section ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-serif font-semibold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Facturation SaaS
              </h2>
              <p className="text-xs text-white/30 mt-0.5">
                {pendingInvoices.length} en attente · {paidInvoices.length} réglée{paidInvoices.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setShowInvForm(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/25 text-primary hover:bg-primary/25 transition-colors"
            >
              {showInvForm ? <X className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
              {showInvForm ? "Annuler" : "Nouvelle facture"}
            </button>
          </div>

          {/* Create invoice form */}
          {showInvForm && (
            <div className="mb-5 p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
              <p className="text-xs text-white/50 font-semibold uppercase tracking-wide">Enregistrer un paiement hors-ligne</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Store selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/40 font-medium">Boutique</label>
                  <Select value={invStoreId} onValueChange={setInvStoreId}>
                    <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10 text-white focus:ring-primary/30">
                      <SelectValue placeholder="Sélectionner…" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 max-h-48">
                      {shops.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs text-white/80 focus:bg-primary/15 focus:text-primary">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Plan selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/40 font-medium">Forfait facturé</label>
                  <Select
                    value={invPlan}
                    onValueChange={(v) => { setInvPlan(v); setInvAmount(DEFAULT_AMOUNTS[v] ?? 0); }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10 text-white focus:ring-primary/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {PLAN_OPTIONS.map(p => (
                        <SelectItem key={p.value} value={p.value} className="text-xs text-white/80 focus:bg-primary/15 focus:text-primary">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/40 font-medium">Montant (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={invAmount}
                    onChange={e => setInvAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-white/40 font-medium">Notes (optionnel)</label>
                  <input
                    type="text"
                    placeholder="ex: Paiement cash, mois de juin…"
                    value={invNotes}
                    onChange={e => setInvNotes(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 placeholder:text-white/20"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateInvoice}
                disabled={creatingInv}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-[#0B0A08] font-semibold rounded-lg text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {creatingInv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                Créer la facture
              </button>
            </div>
          )}

          {/* Invoices table */}
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-white/25 text-sm border border-white/5 rounded-xl">
              Aucune facture pour le moment. Créez-en une ci-dessus.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Boutique</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Forfait</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Montant</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide hidden sm:table-cell">Date</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide hidden md:table-cell">Notes</th>
                    <th className="text-center px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Statut</th>
                    <th className="text-center px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => (
                    <tr key={inv.id} className={`border-b border-white/5 hover:bg-white/2 transition-colors ${idx % 2 === 0 ? "" : "bg-white/1"}`}>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-white text-sm">{inv.storeName}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${PLAN_BADGE[inv.plan] ?? PLAN_BADGE.starter}`}>
                          {inv.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-white font-semibold text-xs">{formatFCFA(inv.amount)}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <div>
                          <p className="text-white/50 text-xs">
                            {new Date(inv.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                          {inv.paidAt && (
                            <p className="text-emerald-400/60 text-[11px] mt-0.5">
                              Payé le {new Date(inv.paidAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-white/35 text-xs">{inv.notes ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {inv.status === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Réglée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 font-semibold">
                            <Clock className="w-3 h-3" /> En attente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {inv.status === "pending" ? (
                          (payingInvId === inv.id || payingOnlineId === inv.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white/40 mx-auto" />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              <button
                                onClick={() => handlePayOnline(inv.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-orange-900/30 border border-orange-500/30 text-orange-400 hover:bg-orange-900/50 transition-colors w-full justify-center"
                              >
                                <Smartphone className="w-3 h-3" />
                                Payer en ligne
                              </button>
                              <button
                                onClick={() => handlePayInvoice(inv.id, inv.storeName, inv.plan)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-colors w-full justify-center"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Marquer réglée
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-white/20 text-xs">—</span>
                            {inv.paymentProvider === "orange_money" && inv.paymentRef && (
                              <span className="text-[10px] text-orange-400/50 font-mono">
                                OM: {inv.paymentRef.slice(0, 10)}…
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Withdrawals Section ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-primary" />
            <h2 className="text-base font-serif font-semibold text-white">Demandes de retrait</h2>
            <span className="ml-1 text-[11px] bg-yellow-900/40 text-yellow-400 border border-yellow-500/25 px-1.5 py-0.5 rounded font-semibold">
              {withdrawals.filter(w => w.status === "pending").length} en attente
            </span>
          </div>

          {withdrawals.length === 0 ? (
            <div className="text-center py-12 text-white/25 text-sm border border-white/5 rounded-xl">
              Aucune demande de retrait pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Boutique</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Méthode</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Coordonnées</th>
                    <th className="text-right px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Montant brut</th>
                    <th className="text-right px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Frais (1%)</th>
                    <th className="text-right px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Net à verser</th>
                    <th className="text-left px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide hidden sm:table-cell">Date</th>
                    <th className="text-center px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Statut</th>
                    <th className="text-center px-4 py-3 text-xs text-white/40 font-semibold uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((wd, idx) => (
                    <tr key={wd.id} className={`border-b border-white/5 hover:bg-white/2 transition-colors ${idx % 2 === 0 ? "" : "bg-white/1"}`}>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-white text-sm">{wd.storeName}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-white/60 text-xs capitalize">{wd.payoutMethod?.replace("_", " ")}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-white/50 text-xs font-mono">{wd.payoutDetails || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-white text-sm font-semibold">{formatFCFA(wd.amount)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-red-400/70 text-xs">{formatFCFA(wd.feeAmount ?? 0)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-primary font-bold text-sm">{formatFCFA(wd.netAmount ?? wd.amount)}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-white/40 text-xs">
                          {new Date(wd.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {wd.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Approuvé
                          </span>
                        ) : wd.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 font-semibold">
                            <X className="w-3 h-3" /> Rejeté
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 font-semibold">
                            <Clock className="w-3 h-3" /> En attente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {wd.status === "pending" ? (
                          approvingWdId === wd.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white/40 mx-auto" />
                          ) : (
                            <button
                              onClick={() => handleApproveWithdrawal(wd.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Approuver
                            </button>
                          )
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
