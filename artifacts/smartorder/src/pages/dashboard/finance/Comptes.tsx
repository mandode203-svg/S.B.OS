import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import { Wallet, CreditCard, Smartphone, Building2, CheckCircle2, Clock } from "lucide-react";

interface Summary {
  totalRevenue: number; totalExpenses: number; profit: number;
  depositReceived: number; balanceDue: number; ordersCount: number;
}

const PAYOUT_ICONS: Record<string, React.ElementType> = {
  wave: Smartphone,
  mtn_momo: Smartphone,
  moov: Smartphone,
  orange_money: Smartphone,
  paystack: CreditCard,
};

const PAYOUT_COLORS: Record<string, string> = {
  wave: "#00B4D8",
  mtn_momo: "#FFC300",
  moov: "#EF4444",
  orange_money: "#FF6B00",
  paystack: "#00D166",
};

export default function Comptes() {
  const { token, business } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payoutInfo, setPayoutInfo] = useState<{ method: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch("/api/finance/summary", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/store/config", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
    ])
      .then(([s, cfg]) => {
        setSummary(s as Summary);
        const pc = (cfg as Record<string, unknown> | null)?.payment_config as Record<string, unknown> | null;
        if (pc?.payout_details) {
          const pd = pc.payout_details as Record<string, string>;
          setPayoutInfo({ method: pd.method ?? "wave", phone: pd.phone ?? "" });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const PayoutIcon = payoutInfo ? (PAYOUT_ICONS[payoutInfo.method] ?? Wallet) : Wallet;
  const payoutColor = payoutInfo ? (PAYOUT_COLORS[payoutInfo.method] ?? "#E8A325") : "#E8A325";

  const accounts = summary ? [
    { label: "Acomptes reçus", value: summary.depositReceived, icon: CheckCircle2, color: "#10B981", note: "Paiements FedaPay confirmés", badge: "encaissé" },
    { label: "Solde à recevoir", value: summary.balanceDue, icon: Clock, color: "#F59E0B", note: "Reste dû à la livraison", badge: "en attente" },
    { label: "Revenus bruts (mois)", value: summary.totalRevenue, icon: TrendingUpIcon, color: "#E8A325", note: "Total commandes livrées", badge: undefined },
    { label: "Dépenses (mois)", value: summary.totalExpenses, icon: MinusIcon, color: "#EF4444", note: "Charges enregistrées", badge: undefined },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-serif font-semibold">Comptes</h1>
          <p className="text-sm text-muted-foreground">Vue consolidée de vos soldes et encaissements</p>
        </div>

        {/* Solde net principal */}
        <div className="bg-gradient-to-br from-[#1A1814] to-[#0B0A08] border border-[#E8A325]/20 rounded-xl p-6">
          <p className="text-xs text-muted-foreground mb-1">Position nette ce mois</p>
          <p className="text-4xl font-serif font-bold text-[#E8A325]">
            {loading ? "—" : formatFCFA(Math.round((summary?.profit ?? 0)))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Revenus {loading ? "—" : formatFCFA(summary?.totalRevenue ?? 0)} — Dépenses {loading ? "—" : formatFCFA(summary?.totalExpenses ?? 0)}
          </p>
        </div>

        {/* Détail des comptes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="bg-[#1A1814] border border-border rounded-xl p-4 h-20 animate-pulse" />)
          ) : accounts.map(a => (
            <div key={a.label} className="bg-[#1A1814] border border-border rounded-xl p-4 flex gap-3 items-start">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${a.color}18` }}>
                <a.icon className="w-4 h-4" style={{ color: a.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{a.label}</p>
                  {a.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: a.color, borderColor: `${a.color}40`, background: `${a.color}10` }}>
                      {a.badge}
                    </span>
                  )}
                </div>
                <p className="text-xl font-serif font-bold" style={{ color: a.color }}>{formatFCFA(Math.round(a.value))}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Moyen de retrait configuré */}
        <div className="bg-[#1A1814] border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Moyen de retrait configuré</h2>
          </div>
          {payoutInfo ? (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${payoutColor}18` }}>
                <PayoutIcon className="w-4 h-4" style={{ color: payoutColor }} />
              </div>
              <div>
                <p className="text-sm font-semibold capitalize">{payoutInfo.method.replace("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{payoutInfo.phone}</p>
              </div>
              <div className="ml-auto">
                <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">Actif</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
              Aucun moyen de retrait configuré.{" "}
              <a href="/dashboard/parametres" className="text-primary hover:underline">Configurer dans les Paramètres →</a>
            </div>
          )}
        </div>

        {/* Résumé statistiques */}
        <div className="bg-[#1A1814] border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Indicateurs ce mois</h2>
          <div className="space-y-3">
            {[
              { label: "Nombre de commandes", value: loading ? "—" : String(summary?.ordersCount ?? 0) },
              { label: "Valeur moyenne/commande", value: loading || !summary ? "—" : summary.ordersCount > 0 ? formatFCFA(Math.round(summary.totalRevenue / summary.ordersCount)) : "—" },
              { label: "Taux d'encaissement acomptes", value: loading || !summary ? "—" : summary.totalRevenue > 0 ? `${Math.round((summary.depositReceived / summary.totalRevenue) * 100)}%` : "0%" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Icônes inline simplifiées
function TrendingUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
}
function MinusIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
