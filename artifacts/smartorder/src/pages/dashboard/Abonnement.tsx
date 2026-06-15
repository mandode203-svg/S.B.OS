import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA, formatDateTime } from "@/lib/utils";
import { BadgeCheck, Clock, FileText, RefreshCw, Wallet, PlusCircle, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  plan: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  paymentProvider: string | null;
  paymentRef: string | null;
}

interface BillingData {
  plan: string;
  trialEndsAt: string | null;
  renewalDate: string | null;
  invoices: Invoice[];
}

interface Withdrawal {
  id: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  payoutMethod: string;
  payoutDetails: string;
  status: string;
  createdAt: string;
}

interface Balance {
  available: number;
  totalDeposits: number;
  totalWithdrawn: number;
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter:  { label: "Starter",  color: "bg-slate-500/15 text-slate-400" },
  business: { label: "Business", color: "bg-blue-500/15 text-blue-400" },
  pro:      { label: "Pro",      color: "bg-primary/15 text-primary" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: "En attente", color: "bg-yellow-500/15 text-yellow-400" },
  paid:      { label: "Payée",      color: "bg-green-500/15 text-green-400" },
  cancelled: { label: "Annulée",    color: "bg-destructive/15 text-destructive" },
  approved:  { label: "Approuvé",   color: "bg-green-500/15 text-green-400" },
};

const PAYOUT_METHODS = [
  { value: "wave",     label: "Wave" },
  { value: "mtn_momo", label: "MTN MoMo" },
  { value: "moov",     label: "Moov Money" },
];

const PLANS = [
  {
    key:   "starter",
    label: "Starter",
    price: "Gratuit",
    color: "border-border",
    badge: "bg-slate-500/15 text-slate-400",
    features: ["Jusqu'à 15 produits", "Assistant IA client", "Commandes & réservations", "1 membre du staff", "QR Code de commande"],
  },
  {
    key:   "business",
    label: "Business",
    price: "15 000 FCFA / mois",
    color: "border-blue-500/30",
    badge: "bg-blue-500/15 text-blue-400",
    features: ["Jusqu'à 100 produits", "Tout le Starter", "Campagnes marketing", "2 membres du staff", "Rapports avancés"],
    highlight: true,
  },
  {
    key:   "pro",
    label: "Pro / Premium",
    price: "30 000 FCFA / mois",
    color: "border-primary/40",
    badge: "bg-primary/15 text-primary",
    features: ["Produits illimités", "Tout le Business", "Staff illimité", "Intégration TikTok Live", "Support prioritaire"],
  },
];

function PlanBadge({ plan }: { plan: string }) {
  const cfg = PLAN_LABELS[plan] ?? { label: plan, color: "bg-muted text-muted-foreground" };
  return <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", cfg.color)}>{cfg.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
  return <span className={cn("text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap", cfg.color)}>{cfg.label}</span>;
}

export default function Abonnement() {
  const { token, business } = useAuth();
  const { toast } = useToast();
  const plan = usePlan();

  const [data, setData]       = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  const [balance, setBalance]         = useState<Balance | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Withdrawal form
  const [showWdForm, setShowWdForm]   = useState(false);
  const [wdAmount, setWdAmount]       = useState("");
  const [wdMethod, setWdMethod]       = useState("wave");
  const [submittingWd, setSubmittingWd] = useState(false);

  const fetchBilling = () => {
    if (!token) return;
    setLoading(true);
    fetch("/api/billing/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: BillingData) => setData(d))
      .catch(() => setData({ plan: business?.plan ?? "starter", trialEndsAt: business?.trialEndsAt ?? null, renewalDate: null, invoices: [] }))
      .finally(() => setLoading(false));
  };

  const fetchBalance = () => {
    if (!token) return;
    setLoadingBalance(true);
    Promise.all([
      fetch("/api/withdrawals/balance", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/withdrawals",          { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([balRes, wdRes]) => {
        if (balRes.ok) setBalance(await balRes.json() as Balance);
        if (wdRes.ok)  setWithdrawals(await wdRes.json() as Withdrawal[]);
      })
      .catch(console.error)
      .finally(() => setLoadingBalance(false));
  };

  useEffect(() => { fetchBilling(); fetchBalance(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWithdrawal = async () => {
    const amount = Number(wdAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" }); return;
    }
    setSubmittingWd(true);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, payout_method: wdMethod }),
    });
    const d = await res.json() as { error?: string; message?: string };
    if (res.ok) {
      toast({ title: "Demande de retrait envoyée !", description: "Un administrateur la traitera sous 24h." });
      setShowWdForm(false); setWdAmount("");
      fetchBalance();
    } else {
      toast({ title: "Erreur", description: d.message ?? d.error, variant: "destructive" });
    }
    setSubmittingWd(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">

        {/* ── Plan actuel ─────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BadgeCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Plan actuel</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <PlanBadge plan={data?.plan ?? "starter"} />
                <span className="text-2xl font-serif font-bold capitalize">{data?.plan ?? "starter"}</span>
              </div>
              <div className="flex flex-col gap-1 sm:ml-auto text-right">
                {plan.isInTrial && (
                  <div className="flex items-center justify-end gap-1.5 text-xs text-yellow-400">
                    <Clock className="w-3 h-3" />
                    <span>Essai gratuit — {plan.trialDaysLeft} jour{plan.trialDaysLeft > 1 ? "s" : ""} restant{plan.trialDaysLeft > 1 ? "s" : ""}</span>
                  </div>
                )}
                {data?.renewalDate && (
                  <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    <RefreshCw className="w-3 h-3" />
                    <span>Prochain renouvellement : {new Date(data.renewalDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                )}
                {!data?.renewalDate && !plan.isInTrial && (
                  <p className="text-xs text-muted-foreground">Aucun renouvellement planifié</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Nos formules ────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Nos formules d'abonnement</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map(p => {
              const isCurrent = (data?.plan ?? "starter") === p.key;
              return (
                <div
                  key={p.key}
                  className={cn(
                    "rounded-xl border p-4 flex flex-col gap-3 transition-all",
                    p.color,
                    isCurrent && "ring-1 ring-primary/30",
                    p.highlight && !isCurrent && "bg-blue-500/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", p.badge)}>{p.label}</span>
                    {isCurrent && <span className="text-[10px] text-primary font-medium">Plan actuel</span>}
                  </div>
                  <p className="text-sm font-bold">{p.price}</p>
                  <ul className="space-y-1.5 flex-1">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      Contactez l'admin pour activer
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Pour souscrire ou changer de plan, contactez notre équipe via WhatsApp.
          </p>
        </div>

        {/* ── Solde disponible & Retraits ─────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Solde disponible & Retraits</h2>
            </div>
            {!showWdForm && (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowWdForm(true)}>
                <PlusCircle className="w-3.5 h-3.5" /> Demander un retrait
              </Button>
            )}
          </div>

          {/* Balance */}
          <div className="px-5 py-4 border-b border-border">
            {loadingBalance ? (
              <div className="h-10 bg-muted rounded animate-pulse w-40" />
            ) : (
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Solde disponible</p>
                  <p className="text-2xl font-serif font-bold text-primary">{formatFCFA(balance?.available ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total acomptes reçus</p>
                  <p className="text-sm font-semibold">{formatFCFA(balance?.totalDeposits ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total retraits approuvés</p>
                  <p className="text-sm font-semibold">{formatFCFA(balance?.totalWithdrawn ?? 0)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Withdrawal form */}
          {showWdForm && (
            <div className="px-5 py-4 border-b border-border bg-muted/30 space-y-3">
              <p className="text-xs font-semibold">Nouvelle demande de retrait</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Montant (FCFA)</Label>
                  <Input
                    type="number"
                    value={wdAmount}
                    onChange={e => setWdAmount(e.target.value)}
                    placeholder="Ex : 25000"
                    className="h-9 text-sm"
                  />
                  {wdAmount && Number(wdAmount) > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Frais (1%) : {formatFCFA(Math.round(Number(wdAmount) * 0.01))} · Net reçu : {formatFCFA(Math.round(Number(wdAmount) * 0.99))}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Méthode de retrait</Label>
                  <Select value={wdMethod} onValueChange={setWdMethod}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYOUT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleWithdrawal} disabled={submittingWd} className="h-8 text-xs gap-1.5">
                  {submittingWd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirmer la demande
                </Button>
                <Button variant="outline" className="h-8 text-xs" onClick={() => setShowWdForm(false)}>Annuler</Button>
              </div>
            </div>
          )}

          {/* Withdrawal history */}
          {loadingBalance ? (
            <div className="p-5 space-y-3">
              {[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="py-10 text-center">
              <Wallet className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune demande de retrait</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2 border-b border-border text-xs text-muted-foreground font-medium">
                <span>Date</span>
                <span className="text-right">Méthode</span>
                <span className="text-right">Montant net</span>
                <span className="text-right">Statut</span>
              </div>
              {withdrawals.map(w => (
                <div key={w.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 border-b border-border last:border-0 items-center">
                  <div>
                    <p className="text-sm">{formatDateTime(w.createdAt)}</p>
                    <p className="text-[11px] text-muted-foreground">Brut : {formatFCFA(w.amount)} · Frais : {formatFCFA(w.feeAmount ?? 0)}</p>
                  </div>
                  <span className="text-sm capitalize text-right">{w.payoutMethod?.replace("_", " ")}</span>
                  <span className="text-sm font-semibold text-primary text-right whitespace-nowrap">{formatFCFA(w.netAmount ?? w.amount)}</span>
                  <div className="flex justify-end"><StatusBadge status={w.status} /></div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Historique des factures ──────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Historique des factures</h2>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
          ) : !data?.invoices.length ? (
            <div className="py-16 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune facture pour l'instant</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2 border-b border-border text-xs text-muted-foreground font-medium">
                <span>Date</span>
                <span className="text-right">Plan</span>
                <span className="text-right">Montant</span>
                <span className="text-right">Statut</span>
              </div>
              {data.invoices.map(inv => (
                <div key={inv.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 border-b border-border last:border-0 items-center">
                  <div>
                    <p className="text-sm">{formatDateTime(inv.createdAt)}</p>
                    {inv.paidAt && <p className="text-[11px] text-muted-foreground">Payée le {formatDateTime(inv.paidAt)}</p>}
                    {inv.paymentRef && <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">Réf : {inv.paymentRef}</p>}
                    {inv.notes && <p className="text-[11px] text-muted-foreground italic">{inv.notes}</p>}
                  </div>
                  <span className="text-sm font-medium capitalize text-right">{inv.plan}</span>
                  <span className="text-sm font-semibold text-primary text-right whitespace-nowrap">{formatFCFA(inv.amount)}</span>
                  <div className="flex justify-end"><StatusBadge status={inv.status} /></div>
                </div>
              ))}
            </>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
