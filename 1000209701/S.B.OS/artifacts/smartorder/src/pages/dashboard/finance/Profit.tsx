import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import { TrendingUp, Target, Award, Percent } from "lucide-react";

interface ProfitMonth { mois: string; revenus: number; dépenses: number; profit: number; marge: number }

const CHART_STYLE = {
  content: { background: "#1A1814", border: "1px solid hsl(40 13% 15%)", borderRadius: 6, fontSize: 11, color: "#FAF5E8" },
};

export default function Profit() {
  const { token } = useAuth();
  const [data, setData] = useState<ProfitMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/finance/profit", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setData(d as ProfitMonth[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const profitGrowth = prev && prev.profit > 0 && last ? ((last.profit - prev.profit) / prev.profit) * 100 : 0;
  const avgMargin = data.length > 0 ? data.reduce((s, d) => s + d.marge, 0) / data.length : 0;
  const bestMonth = data.reduce((best, d) => d.profit > (best?.profit ?? -Infinity) ? d : best, data[0]);

  const kpis = [
    { label: "Profit ce mois", value: last ? formatFCFA(last.profit) : "—", icon: TrendingUp, color: last && last.profit >= 0 ? "text-green-400" : "text-red-400", sub: profitGrowth !== 0 ? `${profitGrowth >= 0 ? "+" : ""}${profitGrowth.toFixed(1)}% vs mois dernier` : undefined },
    { label: "Marge nette moy.", value: `${avgMargin.toFixed(1)}%`, icon: Percent, color: avgMargin > 30 ? "text-green-400" : avgMargin > 10 ? "text-yellow-400" : "text-red-400", sub: "Sur 6 mois" },
    { label: "Meilleur mois", value: bestMonth?.mois ?? "—", icon: Award, color: "text-primary", sub: bestMonth ? formatFCFA(bestMonth.profit) : undefined },
    { label: "Objectif mensuel", value: last ? `${Math.min(100, Math.round((last.profit / 500000) * 100))}%`, icon: Target, color: "text-blue-400", sub: "Objectif : 500 000 FCFA" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-serif font-semibold">Profit & Rentabilité</h1>
          <p className="text-sm text-muted-foreground">Analyse de vos marges sur les 6 derniers mois</p>
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
                {k.sub && <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Graphique barres groupées */}
        <div className="bg-[#1A1814] border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-4">Revenus vs Dépenses vs Profit — 6 mois</h2>
          {loading ? (
            <div className="h-56 bg-muted rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 13% 15%)" />
                <XAxis dataKey="mois" tick={{ fontSize: 10, fill: "#9B9289" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: "#9B9289" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={CHART_STYLE.content} formatter={(v: number, name: string) => [formatFCFA(v), name]} />
                <Legend formatter={v => <span style={{ fontSize: 10, color: "#9B9289" }}>{v}</span>} />
                <ReferenceLine y={0} stroke="hsl(40 13% 25%)" />
                <Bar dataKey="revenus" fill="#10B981" opacity={0.8} radius={[2, 2, 0, 0]} maxBarSize={28} />
                <Bar dataKey="dépenses" fill="#EF4444" opacity={0.8} radius={[2, 2, 0, 0]} maxBarSize={28} />
                <Bar dataKey="profit" fill="#E8A325" opacity={0.9} radius={[2, 2, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tableau détail */}
        <div className="bg-[#1A1814] border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Détail mensuel</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left">Mois</th>
                  <th className="px-4 py-2 text-right">Revenus</th>
                  <th className="px-4 py-2 text-right">Dépenses</th>
                  <th className="px-4 py-2 text-right">Profit</th>
                  <th className="px-4 py-2 text-right">Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
                  ))
                ) : data.map(d => (
                  <tr key={d.mois} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{d.mois}</td>
                    <td className="px-4 py-3 text-right text-green-400">{formatFCFA(d.revenus)}</td>
                    <td className="px-4 py-3 text-right text-red-400">{formatFCFA(d.dépenses)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${d.profit >= 0 ? "text-primary" : "text-destructive"}`}>{formatFCFA(d.profit)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${d.marge > 30 ? "bg-green-500/15 text-green-400" : d.marge > 10 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>
                        {d.marge}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
