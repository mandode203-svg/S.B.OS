import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  available: boolean;
  stockQty: number;
  photoUrl?: string | null;
  tiktokCode?: string | null;
}

const EMPTY: Omit<Product, "id"> = { name: "", description: "", price: 0, category: "", available: true, stockQty: 0, photoUrl: "", tiktokCode: "" };

export default function Catalogue() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    const res = await fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [token]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, description: p.description ?? "", price: p.price, category: p.category, available: p.available, stockQty: p.stockQty, photoUrl: p.photoUrl ?? "", tiktokCode: p.tiktokCode ?? "" }); setOpen(true); };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.category || form.price <= 0) {
      toast({ title: "Erreur", description: "Nom, catégorie et prix sont requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    const url = editing ? `/api/products/${editing.id}` : "/api/products";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price), stockQty: Number(form.stockQty) }),
    });
    if (res.ok) {
      toast({ title: editing ? "Produit mis à jour" : "Produit créé" });
      setOpen(false);
      fetchProducts();
    } else {
      const d = await res.json();
      toast({ title: "Erreur", description: d.error, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { setProducts(p => p.filter(x => x.id !== id)); toast({ title: "Produit supprimé" }); }
  };

  const categories = [...new Set(products.map(p => p.category))];
  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Ajouter un produit
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-card border border-border rounded h-40 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Aucun produit. Commencez par en ajouter un.</p>
          </div>
        ) : (
          <div>
            {categories.filter(cat => filtered.some(p => p.category === cat || !search)).map(cat => {
              const items = filtered.filter(p => p.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{cat}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {items.map(product => (
                      <div key={product.id} className="bg-card border border-border rounded p-3 group relative">
                        {product.photoUrl && (
                          <img src={product.photoUrl} alt={product.name} className="w-full h-24 object-cover rounded mb-2" />
                        )}
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            {product.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>}
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${product.available ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}>
                            {product.available ? "Dispo" : "Indispo"}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-primary mt-2">{formatFCFA(product.price)}</p>
                        <p className="text-xs text-muted-foreground">Stock: {product.stockQty}</p>
                        <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                          <button onClick={() => openEdit(product)} className="w-6 h-6 bg-card border border-border rounded flex items-center justify-center hover:bg-muted">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="w-6 h-6 bg-card border border-border rounded flex items-center justify-center hover:bg-destructive/20 text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nom *</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Catégorie *</Label>
                <Input value={form.category} onChange={e => set("category", e.target.value)} placeholder="ex: Plats, Boissons" className="mt-1" />
              </div>
              <div>
                <Label>Prix (FCFA) *</Label>
                <Input type="number" value={form.price} onChange={e => set("price", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Stock</Label>
                <Input type="number" value={form.stockQty} onChange={e => set("stockQty", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Photo URL</Label>
                <Input value={form.photoUrl ?? ""} onChange={e => set("photoUrl", e.target.value)} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)} rows={2} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Code produit TikTok Live</Label>
                <Input
                  value={form.tiktokCode ?? ""}
                  onChange={e => set("tiktokCode", e.target.value.toUpperCase())}
                  placeholder="ex: ROBE01, SAC02"
                  className="mt-1 font-mono uppercase"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Les clients commentent ce code + leur numéro lors de votre Live TikTok pour commander automatiquement.
                </p>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch checked={form.available} onCheckedChange={v => set("available", v)} />
                <Label>Disponible à la commande</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
