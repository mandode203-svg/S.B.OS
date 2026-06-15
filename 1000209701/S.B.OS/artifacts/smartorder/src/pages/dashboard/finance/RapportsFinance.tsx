import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Printer, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ProfitMonth { mois: string; revenus: number; dépenses: number; profit: number; marge: number }
interface Summary { totalRevenue: number; totalExpenses: number; profit: number; margin: number; ordersCount: number; growthRate: number; depositReceived: number; balanceDue: number }

export default function RapportsFinance() {
  const { token, business } = useAuth();
  const [profitData, setProfitData] = useState<ProfitMonth[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch("/api/finance/profit", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/finance/summary", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([p, s]) => { setProfitData(p as ProfitMonth[]); setSummary(s as Summary); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const header = "Mois,Revenus (FCFA),Dépenses (FCFA),Profit (FCFA),Marge (%)";
    const rows = profitData.map(d => `${d.mois},${d.revenus},${d.dépenses},${d.profit},${d.marge}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-finance-${business?.name?.replace(/\s+/g, "-") ?? "smartorder"}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentMonth = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif font-semibold">Rapport Financier</h1>
            <p className="text-sm text-muted-foreground">Rapport comptable — {business?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-3.5 h-3.5" /> Imprimer
            </Button>
          </div>
        </div>

        {/* En-tête rapport */}
        <div className="bg-[#1A1814] border border-border rounded-xl p-5 print:border-black">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Rapport FinanceTPE</span>
              </div>
              <h2 className="text-lg font-serif font-bold">{business?.name ?? "—"}</h2>
              <p className="text-xs text-muted-foreground">{business?.address}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Généré le</p>
              <p className="text-sm font-medium">{new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
              <p className="text-xs text-muted-foreground mt-1">Période : {currentMonth}</p>
            </div>
          </div>

          {/* Résumé exécutif */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)
            ) : [
              { label: "Chiffre d'affaires", value: formatFCFA(summary?.totalRevenue ?? 0), color: "text-foreground" },
              { label: "Charges totales",    value: formatFCFA(summary?.totalExpenses ?? 0), color: "text-red-400" },
              { label: "Résultat net",       value: formatFCFA(summary?.profit ?? 0), color: (summary?.profit ?? 0) >= 0 ? "text-green-400" : "text-red-400" },
              { label: "Marge nette",        value: `${summary?.margin ?? 0}%`, color: "text-primary" },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className={`text-lg font-serif font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tableau Compte de résultat */}
        <div className="bg-[#1A1814] border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Compte de résultat — 6 mois</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground bg-muted/20">
                  <th className="px-4 py-2.5 text-left">Mois</th>
                  <th className="px-4 py-2.5 text-right">Produits (CA)</th>
                  <th className="px-4 py-2.5 text-right">Charges</th>
                  <th className="px-4 py-2.5 text-right">Résultat</th>
                  <th className="px-4 py-2.5 text-right">Marge</th>
                  <th className="px-4 py-2.5 text-center">Tendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  [...Array(6)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>)
                ) : profitData.map((d, i) => {
                  const prev = profitData[i - 1];
                  const trend = prev ? d.profit - prev.profit : 0;
                  return (
                    <tr key={d.mois} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{d.mois}</td>
                      <td className="px-4 py-3 text-right text-green-400">{formatFCFA(d.revenus)}</td>
                      <td className="px-4 py-3 text-right text-red-400">{formatFCFA(d.dépenses)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${d.profit >= 0 ? "text-primary" : "text-destructive"}`}>{formatFCFA(d.profit)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${d.marge >= 30 ? "bg-green-500/15 text-green-400" : d.marge >= 10 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>
                          {d.marge}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {prev == null ? (
                          <Minus className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
                        ) : trend > 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-green-400 mx-auto" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-red-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {!loading && profitData.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/10 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right text-green-400">{formatFCFA(profitData.reduce((s, d) => s + d.revenus, 0))}</td>
                    <td className="px-4 py-3 text-right text-red-400">{formatFCFA(profitData.reduce((s, d) => s + d.dépenses, 0))}</td>
                    <td className="px-4 py-3 text-right text-primary">{formatFCFA(profitData.reduce((s, d) => s + d.profit, 0))}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {profitData.length > 0 ? `${Math.round(profitData.reduce((s, d) => s + d.marge, 0) / profitData.length)}% moy.` : "—"}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Pied de page rapport */}
        <div className="text-center text-xs text-muted-foreground pb-2">
          Rapport généré par SmartOrder AI — FinanceTPE · {new Date().toLocaleDateString("fr-FR")} · Données en FCFA
        </div>
      </div>
    </DashboardLayout>
  );
}
