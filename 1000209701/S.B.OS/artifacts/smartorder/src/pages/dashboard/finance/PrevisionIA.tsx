import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Area, ReferenceLine,
} from "recharts";
import { Bot, TrendingUp, TrendingDown, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ForecastPoint { date: string; réel: number | null; prévision: number | null }
interface ForecastData {
  series: ForecastPoint[];
  forecast: { date: string; amount: number }[];
  totalForecast7: number;
  confidence: number;
  trend: number;
  alerts: string[];
}

const CHART_STYLE = {
  content: { background: "#1A1814", border: "1px solid hsl(40 13% 15%)", borderRadius: 6, fontSize: 11, color: "#FAF5E8" },
};

function formatAxisDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

const todayStr = new Date().toISOString().split("T")[0];

export default function PrevisionIA() {
  const { token } = useAuth();
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchForecast = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch("/api/finance/forecast", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setData(await r.json() as ForecastData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchForecast(); }, [token]);

  const trendLabel = data && data.trend > 2 ? "↑ Hausse" : data && data.trend < -2 ? "↓ Baisse" : "→ Stable";
  const trendColor = data && data.trend > 2 ? "text-green-400" : data && data.trend < -2 ? "text-red-400" : "text-yellow-400";

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-semibold">Prévisions IA</h1>
              <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">IA</span>
            </div>
            <p className="text-sm text-muted-foreground">L'IA anticipe vos revenus sur les 7 prochains jours</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchForecast} disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Prévision 7 jours", value: data ? formatFCFA(data.totalForecast7) : "—", icon: TrendingUp, color: "text-primary" },
            { label: "Fiabilité IA", value: data ? `${data.confidence}%` : "—", icon: Bot, color: "text-blue-400" },
            { label: "Tendance", value: data ? trendLabel : "—", icon: data && data.trend >= 0 ? TrendingUp : TrendingDown, color: trendColor },
            { label: "Alertes actives", value: data ? String(data.alerts.length) : "—", icon: AlertTriangle, color: data && data.alerts.length > 1 ? "text-yellow-400" : "text-green-400" },
          ].map(k => (
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

        {/* Graphique prévision */}
        <div className="bg-[#1A1814] border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold">Historique réel + prévision 7 jours</h2>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-6 h-0.5 bg-[#E8A325] inline-block rounded" /> Réel
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-6 h-0.5 border-t-2 border-dashed border-blue-400 inline-block" /> Prévision IA
            </span>
          </div>
          {loading ? (
            <div className="h-56 bg-muted rounded animate-pulse flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={data.series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8A325" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#E8A325" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 13% 15%)" />
                <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 10, fill: "#9B9289" }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: "#9B9289" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={CHART_STYLE.content} formatter={(v: number | null, name: string) => [v != null ? formatFCFA(v) : "—", name === "réel" ? "Réel" : "Prévision IA"]} labelFormatter={formatAxisDate} />
                <ReferenceLine x={todayStr} stroke="#E8A325" strokeDasharray="4 4" label={{ value: "Auj.", fill: "#E8A325", fontSize: 9 }} />
                <Area type="monotone" dataKey="réel" stroke="#E8A325" strokeWidth={2} fill="url(#realGrad)" dot={false} connectNulls={false} activeDot={{ r: 4, fill: "#E8A325" }} />
                <Area type="monotone" dataKey="prévision" stroke="#3B82F6" strokeWidth={2} strokeDasharray="6 3" fill="url(#prevGrad)" dot={false} connectNulls={false} activeDot={{ r: 4, fill: "#3B82F6" }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Données insuffisantes pour générer une prévision.</p>
          )}
        </div>

        {/* Alertes IA */}
        <div className="bg-[#1A1814] border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Alertes & recommandations IA</h2>
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {(data?.alerts ?? ["Données insuffisantes pour générer des recommandations."]).map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <span className="text-base leading-none mt-0.5">{alert.slice(0, 2)}</span>
                  <p className="text-sm text-foreground/90 leading-relaxed">{alert.slice(2).trim()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prévisions détail J+1 à J+7 */}
        {data && data.forecast.length > 0 && (
          <div className="bg-[#1A1814] border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Prévisions jour par jour</h2>
            </div>
            <div className="divide-y divide-border">
              {data.forecast.map((f, i) => (
                <div key={f.date} className="flex items-center px-4 py-3 gap-3">
                  <span className="text-xs text-muted-foreground w-8 shrink-0">J+{i + 1}</span>
                  <span className="text-sm flex-1">{new Date(f.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}</span>
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden mx-2 hidden sm:block">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (f.amount / (data.forecast[0]!.amount * 1.5)) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-blue-400">{formatFCFA(f.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
