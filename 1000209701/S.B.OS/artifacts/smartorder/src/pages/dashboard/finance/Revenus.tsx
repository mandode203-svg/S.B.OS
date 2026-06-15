import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, ArrowUpRight, Wallet, ShoppingBag, CreditCard } from "lucide-react";

interface DailyPoint { date: string; revenue: number; orders: number; deposits: number }
interface Summary {
  totalRevenue: number; growthRate: number; ordersCount: number;
  depositReceived: number; balanceDue: number;
}

const CHART_STYLE = {
  content: { background: "#1A1814", border: "1px solid hsl(40 13% 15%)", borderRadius: 6, fontSize: 11, color: "#FAF5E8" },
};

function KpiCard({ label, value, sub, icon: Icon, trend }: { label: string; value: string; sub?: string; icon: React.ElementType; trend?: number }) {
  return (
    <div className="bg-[#1A1814] border border-border rounded-xl p-4 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-lg bg-[#E8A325]/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#E8A325]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-xl font-serif font-bold leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function formatAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default function Revenus() {
  const { token } = useAuth();
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/finance/revenue/daily?days=${range}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/finance/summary", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([d, s]) => { setDaily(d as DailyPoint[]); setSummary(s as Summary); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, range]);

  const avgDaily = daily.length > 0 ? daily.reduce((s, d) => s + d.revenue, 0) / daily.length : 0;
  const bestDay = daily.reduce((best, d) => d.revenue > (best?.revenue ?? 0) ? d : best, daily[0]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-serif font-semibold">Revenus</h1>
          <p className="text-sm text-muted-foreground">Analyse détaillée de vos encaissements ce mois</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Revenus ce mois" value={summary ? formatFCFA(summary.totalRevenue) : "—"} icon={TrendingUp} trend={summary?.growthRate} sub="vs mois passé" />
          <KpiCard label="Acomptes reçus" value={summary ? formatFCFA(summary.depositReceived) : "—"} icon={CreditCard} sub="Encaissés" />
          <KpiCard label="Solde à percevoir" value={summary ? formatFCFA(summary.balanceDue) : "—"} icon={Wallet} sub="À la livraison" />
          <KpiCard label="Revenu moyen/jour" value={loading ? "—" : formatFCFA(Math.round(avgDaily))} icon={ShoppingBag} sub={bestDay ? `Pic: ${formatAxisDate(bestDay.date)}` : undefined} />
        </div>

        {/* Graphique */}
        <div className="bg-[#1A1814] border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Évolution des revenus</h2>
            <div className="flex gap-1">
              {[7, 30, 60].map(d => (
                <button
                  key={d}
                  onClick={() => setRange(d)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${range === d ? "bg-[#E8A325] text-black font-medium" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {d}j
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-48 bg-muted rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8A325" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#E8A325" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 13% 15%)" />
                <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 10, fill: "#9B9289" }} tickLine={false} axisLine={false} interval={Math.floor(daily.length / 6)} />
                <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: "#9B9289" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={CHART_STYLE.content}
                  formatter={(v: number) => [formatFCFA(v), "Revenus"]}
                  labelFormatter={formatAxisDate}
                />
                <Area type="monotone" dataKey="revenue" stroke="#E8A325" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: "#E8A325" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tableau des 10 meilleurs jours */}
        <div className="bg-[#1A1814] border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Meilleurs jours de vente</h2>
          </div>
          <div className="divide-y divide-border">
            {[...daily].sort((a, b) => b.revenue - a.revenue).slice(0, 8).map((d, i) => (
              <div key={d.date} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}</p>
                  <p className="text-xs text-muted-foreground">{d.orders} commande{d.orders > 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-1 text-[#E8A325]">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span className="text-sm font-semibold">{formatFCFA(d.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
