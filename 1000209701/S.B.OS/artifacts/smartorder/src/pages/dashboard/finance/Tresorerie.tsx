import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface CashflowPoint { date: string; entrées: number; sorties: number; solde: number }

const CHART_STYLE = {
  content: { background: "#1A1814", border: "1px solid hsl(40 13% 15%)", borderRadius: 6, fontSize: 11, color: "#FAF5E8" },
};

function formatAxisDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export default function Tresorerie() {
  const { token } = useAuth();
  const [data, setData] = useState<CashflowPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/finance/cashflow?days=${range}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setData(d as CashflowPoint[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, range]);

  const totalEntrées = data.reduce((s, d) => s + d.entrées, 0);
  const totalSorties = data.reduce((s, d) => s + d.sorties, 0);
  const soldeActuel  = data.length > 0 ? data[data.length - 1]!.solde : 0;
  const positionNette = totalEntrées - totalSorties;

  const kpis = [
    { label: "Solde actuel", value: formatFCFA(Math.round(soldeActuel)), icon: Wallet, color: soldeActuel >= 0 ? "text-green-400" : "text-red-400" },
    { label: `Entrées (${range}j)`, value: formatFCFA(Math.round(totalEntrées)), icon: ArrowDownLeft, color: "text-green-400" },
    { label: `Sorties (${range}j)`, value: formatFCFA(Math.round(totalSorties)), icon: ArrowUpRight, color: "text-red-400" },
    { label: "Position nette", value: formatFCFA(Math.round(positionNette)), icon: positionNette >= 0 ? TrendingUp : TrendingDown, color: positionNette >= 0 ? "text-primary" : "text-destructive" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-serif font-semibold">Trésorerie</h1>
          <p className="text-sm text-muted-foreground">Flux de trésorerie — entrées, sorties, position nette</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="bg-[#1A1814] border border-border rounded-xl p-4 flex gap-3 items-start">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{k.label}</p>
                <p className="text-base font-serif font-bold leading-tight">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Graphique flux */}
        <div className="bg-[#1A1814] border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Flux de trésorerie</h2>
            <div className="flex gap-1">
              {[7, 30, 60].map(d => (
                <button key={d} onClick={() => setRange(d)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${range === d ? "bg-[#E8A325] text-black font-medium" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {d}j
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-56 bg-muted rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 13% 15%)" />
                <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 10, fill: "#9B9289" }} tickLine={false} axisLine={false} interval={Math.floor(data.length / 6)} />
                <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: "#9B9289" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={CHART_STYLE.content} formatter={(v: number, name: string) => [formatFCFA(Math.round(v)), name]} labelFormatter={formatAxisDate} />
                <Legend formatter={v => <span style={{ fontSize: 10, color: "#9B9289" }}>{v}</span>} />
                <Bar dataKey="entrées" fill="#10B981" opacity={0.7} radius={[2, 2, 0, 0]} maxBarSize={20} />
                <Bar dataKey="sorties" fill="#EF4444" opacity={0.7} radius={[2, 2, 0, 0]} maxBarSize={20} />
                <Line type="monotone" dataKey="solde" stroke="#E8A325" strokeWidth={2} dot={false} name="Solde cumulé" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Analyse santé financière */}
        <div className="bg-[#1A1814] border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Santé financière</h2>
          <div className="space-y-3">
            {[
              { label: "Ratio entrées/sorties", value: totalSorties > 0 ? `${(totalEntrées / totalSorties).toFixed(2)}x` : "—", good: totalEntrées > totalSorties, note: "Idéal : > 1" },
              { label: "Couverture des charges", value: totalEntrées > 0 ? `${Math.round((1 - totalSorties / totalEntrées) * 100)}%` : "—", good: totalEntrées > totalSorties, note: "% de marge sur recettes" },
              { label: "Tendance du solde", value: data.length > 7 ? (data[data.length - 1]!.solde > data[data.length - 7]!.solde ? "↑ Hausse" : "↓ Baisse") : "—", good: data.length > 7 && data[data.length - 1]!.solde > data[data.length - 7]!.solde, note: "sur 7 derniers jours" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.good ? "bg-green-500" : "bg-red-400"}`} />
                <div className="flex-1">
                  <span className="text-sm">{item.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{item.note}</span>
                </div>
                <span className={`text-sm font-semibold ${item.good ? "text-green-400" : "text-red-400"}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
