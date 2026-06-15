import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Cell,
} from "recharts";
import { TrendingUp, Users, ShoppingBag, BarChart2, Flame, Star } from "lucide-react";

interface DailyRevenue { date: string; revenue: number; ordersCount: number }
interface TopProduct { productId: string; name: string; totalSold: number; totalRevenue: number }
interface TopClient { clientId: string; name: string; phone: string; totalOrders: number; totalSpent: number }
interface HourlyPoint { dayOfWeek: number; hour: number; count: number }
interface Summary { totalRevenue: number; ordersCount: number; avgOrderValue: number }

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const CHART_STYLE = {
  content: { background: "#0B0A08", border: "1px solid hsl(40 13% 15%)", borderRadius: 4, fontSize: 12 },
  label: { color: "#FAF5E8" },
};

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="bg-[#1A1814] border border-border rounded p-4 flex gap-3 items-start">
      <div className="w-9 h-9 rounded bg-[#E8A325]/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#E8A325]" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-xl font-serif font-bold leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function buildForecast(daily: DailyRevenue[]): Array<{ date: string; réel: number | null; prévision: number | null }> {
  if (daily.length < 7) return [];
  const recent = daily.slice(-14);
  const avg7 = recent.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;
  const avg14 = recent.reduce((s, d) => s + d.revenue, 0) / 14;
  const trend = (avg7 - avg14) / avg14;

  const result = recent.map(d => ({ date: d.date, réel: Math.round(d.revenue) as number | null, prévision: null as number | null }));

  for (let i = 1; i <= 7; i++) {
    const base = recent[recent.length - 1].revenue;
    const projected = Math.round(base * (1 + trend * i * 0.5) * (0.9 + Math.random() * 0.2));
    const next = new Date(recent[recent.length - 1].date);
    next.setDate(next.getDate() + i);
    result.push({ date: next.toISOString().split("T")[0], réel: null as number | null, prévision: Math.max(projected, 0) });
  }
  return result;
}

function buildPeakHours(hourly: HourlyPoint[]): Array<{ heure: string; commandes: number; intensity: number }> {
  const byHour: Record<number, number> = {};
  for (const p of hourly) {
    byHour[p.hour] = (byHour[p.hour] ?? 0) + p.count;
  }
  const max = Math.max(...Object.values(byHour), 1);
  return Array.from({ length: 16 }, (_, i) => {
    const h = i + 7;
    const count = byHour[h] ?? 0;
    return { heure: `${h}h`, commandes: count, intensity: count / max };
  });
}

function buildDayOfWeek(hourly: HourlyPoint[]) {
  const byDay: Record<number, number> = {};
  for (const p of hourly) byDay[p.dayOfWeek] = (byDay[p.dayOfWeek] ?? 0) + p.count;
  return DAYS_FR.map((label, i) => ({ jour: label, commandes: byDay[i] ?? 0 }));
}

export default function Rapports() {
  const { token } = useAuth();
  const [daily, setDaily] = useState<DailyRevenue[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/reports/daily-revenue?days=30", { headers: h }).then(r => r.ok ? r.json() : []),
      fetch("/api/reports/top-products?limit=5", { headers: h }).then(r => r.ok ? r.json() : []),
      fetch("/api/reports/top-clients?limit=5", { headers: h }).then(r => r.ok ? r.json() : []),
      fetch("/api/reports/summary", { headers: h }).then(r => r.ok ? r.json() : null),
      fetch("/api/reports/hourly", { headers: h }).then(r => r.ok ? r.json() : []),
    ]).then(([d, tp, tc, s, hr]) => {
      setDaily(d);
      setTopProducts(tp);
      setTopClients(tc);
      setSummary(s);
      setHourly(hr);
      setLoading(false);
    });
  }, [token]);

  const fmt = (dateStr: string) =>
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(dateStr));

  const chartData = daily.map(d => ({ date: fmt(d.date), "CA": Math.round(d.revenue), Commandes: d.ordersCount }));
  const forecastData = buildForecast(daily).map(d => ({ ...d, date: fmt(d.date) }));
  const peakHours = buildPeakHours(hourly);
  const dayOfWeek = buildDayOfWeek(hourly);

  const peakHour = peakHours.reduce((a, b) => b.commandes > a.commandes ? b : a, peakHours[0]);
  const peakDay = dayOfWeek.reduce((a, b) => b.commandes > a.commandes ? b : a, dayOfWeek[0]);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-6">
        {/* KPI cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-card border border-border rounded animate-pulse" />)}
          </div>
        ) : summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="CA total (30 j)" value={formatFCFA(summary.totalRevenue)} icon={TrendingUp} />
            <StatCard label="Commandes" value={summary.ordersCount.toString()} icon={ShoppingBag} />
            <StatCard label="Panier moyen" value={formatFCFA(summary.avgOrderValue)} icon={BarChart2} />
            <StatCard
              label="Heure de pointe"
              value={peakHour ? peakHour.heure : "—"}
              sub={peakDay ? `Jour fort: ${peakDay.jour}` : undefined}
              icon={Flame}
            />
          </div>
        )}

        {/* Revenue chart */}
        <div className="bg-[#1A1814] border border-border rounded p-4">
          <h3 className="text-sm font-semibold font-serif mb-4">Chiffre d'affaires — 30 derniers jours</h3>
          {loading ? <div className="h-52 bg-muted rounded animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 13% 13%)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(40 10% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fill: "hsl(40 10% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={36} />
                <Tooltip contentStyle={CHART_STYLE.content} labelStyle={CHART_STYLE.label} formatter={(v: number) => [formatFCFA(v), "CA"]} />
                <Bar dataKey="CA" fill="#E8A325" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── DEMAND FORECASTING ── */}
        <div className="bg-[#1A1814] border border-[#E8A325]/30 rounded p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#E8A325]" />
            <h3 className="text-sm font-semibold font-serif">Prévisions de demande — 7 prochains jours</h3>
            <span className="ml-auto text-xs bg-[#E8A325]/10 text-[#E8A325] px-2 py-0.5 rounded-full font-medium">IA</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Projection basée sur la tendance des 14 derniers jours</p>
          {loading ? <div className="h-52 bg-muted rounded animate-pulse" /> : forecastData.length < 7 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Pas assez de données (minimum 7 jours d'historique requis)</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={forecastData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 13% 13%)" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(40 10% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fill: "hsl(40 10% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={36} />
                  <Tooltip contentStyle={CHART_STYLE.content} labelStyle={CHART_STYLE.label} formatter={(v: number) => [formatFCFA(v), ""]} />
                  <Line dataKey="réel" stroke="#E8A325" strokeWidth={2} dot={false} connectNulls={false} />
                  <Line dataKey="prévision" stroke="#E8A325" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-[#E8A325]" /> Réel</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 border-t-2 border-dashed border-[#E8A325]" /> Prévision</span>
              </div>
            </>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Peak hours */}
          <div className="bg-[#1A1814] border border-border rounded p-4">
            <h3 className="text-sm font-semibold font-serif mb-4">Heures de pointe</h3>
            {loading ? <div className="h-40 bg-muted rounded animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={peakHours} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="heure" tick={{ fill: "hsl(40 10% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
                  <YAxis hide />
                  <Tooltip contentStyle={CHART_STYLE.content} labelStyle={CHART_STYLE.label} formatter={(v: number) => [v, "Commandes"]} />
                  <Bar dataKey="commandes" radius={[2, 2, 0, 0]}>
                    {peakHours.map((entry, i) => (
                      <Cell key={i} fill={`rgba(232,163,37,${0.2 + entry.intensity * 0.8})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Day of week */}
          <div className="bg-[#1A1814] border border-border rounded p-4">
            <h3 className="text-sm font-semibold font-serif mb-4">Activité par jour de la semaine</h3>
            {loading ? <div className="h-40 bg-muted rounded animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dayOfWeek} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="jour" tick={{ fill: "hsl(40 10% 55%)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={CHART_STYLE.content} labelStyle={CHART_STYLE.label} formatter={(v: number) => [v, "Commandes"]} />
                  <Bar dataKey="commandes" fill="#E8A325" radius={[2, 2, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top products + Top clients */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-[#1A1814] border border-border rounded p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-[#E8A325]" />
              <h3 className="text-sm font-semibold font-serif">Top 5 produits</h3>
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}</div>
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => {
                  const maxRev = topProducts[0]?.totalRevenue ?? 1;
                  return (
                    <div key={p.productId}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                        <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.totalSold} vendus</span>
                        <span className="text-sm font-semibold text-[#E8A325]">{formatFCFA(p.totalRevenue)}</span>
                      </div>
                      <div className="ml-6 h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[#E8A325]" style={{ width: `${(p.totalRevenue / maxRev) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-[#1A1814] border border-border rounded p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[#E8A325]" />
              <h3 className="text-sm font-semibold font-serif">Top 5 clients</h3>
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}</div>
            ) : topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((c, i) => {
                  const maxSpent = topClients[0]?.totalSpent ?? 1;
                  return (
                    <div key={c.clientId}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                        <span className="text-sm font-medium flex-1 truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.totalOrders} cmd</span>
                        <span className="text-sm font-semibold text-[#E8A325]">{formatFCFA(c.totalSpent)}</span>
                      </div>
                      <div className="ml-6 h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[#E8A325]" style={{ width: `${(c.totalSpent / maxSpent) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
