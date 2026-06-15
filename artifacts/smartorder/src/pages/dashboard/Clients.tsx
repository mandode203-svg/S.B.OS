import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA, formatDate } from "@/lib/utils";
import { Search, Users, TrendingUp, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string | null;
  notes?: string | null;
}

export default function Clients() {
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [selected, setSelected] = useState<Client | null>(null);
  const [clientOrders, setClientOrders] = useState<unknown[]>([]);

  useEffect(() => {
    fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setClients(d); setLoading(false); });
  }, [token]);

  const loadClient = async (c: Client) => {
    setSelected(c);
    const res = await fetch(`/api/clients/${c.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setClientOrders(data.orders ?? []);
    }
  };

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  ).sort((a, b) => {
    if (sortBy === "totalSpent") return b.totalSpent - a.totalSpent;
    if (sortBy === "totalOrders") return b.totalOrders - a.totalOrders;
    return 0;
  });

  return (
    <DashboardLayout>
      <div className="flex gap-4 h-full flex-col">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Plus récents</SelectItem>
              <SelectItem value="totalSpent">CA le plus élevé</SelectItem>
              <SelectItem value="totalOrders">Plus de commandes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 bg-card border border-border rounded overflow-hidden flex flex-col">
            <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-border text-xs text-muted-foreground font-medium">
              <span className="col-span-2">Client</span>
              <span>Commandes</span>
              <span>CA total</span>
              <span>Dernière commande</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="p-4 space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun client</p>
                </div>
              ) : filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => loadClient(c)}
                  className={`w-full grid grid-cols-5 gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${selected?.id === c.id ? "bg-muted/50" : ""}`}
                >
                  <div className="col-span-2">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <span className="text-sm self-center">{c.totalOrders}</span>
                  <span className="text-sm font-semibold text-primary self-center">{formatFCFA(c.totalSpent)}</span>
                  <span className="text-xs text-muted-foreground self-center">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</span>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="w-72 bg-card border border-border rounded p-4 overflow-y-auto flex-shrink-0">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-serif font-semibold">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground">{selected.phone}</p>
                  {selected.email && <p className="text-xs text-muted-foreground">{selected.email}</p>}
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground text-xs hover:text-foreground">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-muted rounded p-3 text-center">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold font-serif">{selected.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Commandes</p>
                </div>
                <div className="bg-muted rounded p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-base font-bold font-serif">{formatFCFA(selected.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">CA total</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">DERNIÈRES COMMANDES</p>
                <div className="space-y-1.5">
                  {(clientOrders as Array<{ id: string; total: number; status: string; createdAt: string }>).slice(0, 5).map(o => (
                    <div key={o.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{formatDate(o.createdAt)}</span>
                      <span className="font-medium">{formatFCFA(o.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
