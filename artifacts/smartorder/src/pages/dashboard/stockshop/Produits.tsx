/**
 * Produits.tsx — StockShop > Produits
 * ─────────────────────────────────────────────────────────────────
 * ✅ Réutilise : DashboardLayout, apiFetch, useAuth, formatFCFA,
 *               useToast, tous les composants UI existants
 * ✅ Route existante : /dashboard/stockshop/produits
 * ✅ API existante   : GET/POST/PUT/DELETE /products
 * ✅ Aucun autre fichier modifié
 */

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFCFA } from "@/lib/utils";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/hooks/use-toast";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Plus, Search, Package, TrendingDown, AlertTriangle,
  ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2,
  Eye, ChevronLeft, ChevronRight, X, ImageOff, Boxes,
  Tag, BarChart3, ArrowUpDown,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */
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

type SortKey = "name" | "category" | "price" | "stockQty" | "available";
type SortDir = "asc" | "desc";

const EMPTY: Omit<Product, "id"> = {
  name: "", description: "", price: 0, category: "",
  available: true, stockQty: 0, photoUrl: "", tiktokCode: "",
};

const PAGE_SIZES = [10, 25, 50];
const LOW_STOCK_THRESHOLD = 5;

/* ── Composant principal ─────────────────────────────────────── */
export default function Produits() {
  const { token } = useAuth();
  const { toast } = useToast();

  // ── Data ──
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);

  // ── Filtres ──
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("__all__");
  const [availFilter, setAvailFilter] = useState("__all__");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // ── Tri ──
  const [sortKey, setSortKey]     = useState<SortKey>("name");
  const [sortDir, setSortDir]     = useState<SortDir>("asc");

  // ── Pagination ──
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);

  // ── UI ──
  const [formOpen, setFormOpen]   = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [editing, setEditing]     = useState<Product | null>(null);
  const [detail, setDetail]       = useState<Product | null>(null);
  const [form, setForm]           = useState<Omit<Product, "id">>(EMPTY);
  const [saving, setSaving]       = useState(false);

  /* ── Fetch ──────────────────────────────────────────────────── */
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/products");
      if (res.ok) setProducts(await res.json());
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [token]);

  /* ── Catégories uniques ──────────────────────────────────────── */
  const categories = useMemo(
    () => [...new Set(products.map(p => p.category))].sort(),
    [products]
  );

  /* ── Statistiques ────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total:      products.length,
    actifs:     products.filter(p => p.available).length,
    rupture:    products.filter(p => p.stockQty === 0).length,
    stockFaible:products.filter(p => p.stockQty > 0 && p.stockQty <= LOW_STOCK_THRESHOLD).length,
    valeur:     products.reduce((s, p) => s + p.price * p.stockQty, 0),
  }), [products]);

  /* ── Filtrage + tri + pagination ─────────────────────────────── */
  const filtered = useMemo(() => {
    let list = [...products];

    // Recherche (nom + SKU/tiktokCode)
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.tiktokCode ?? "").toLowerCase().includes(q)
      );
    }

    // Catégorie
    if (catFilter !== "__all__") list = list.filter(p => p.category === catFilter);

    // Disponibilité
    if (availFilter === "available")   list = list.filter(p => p.available);
    if (availFilter === "unavailable") list = list.filter(p => !p.available);

    // Stock faible
    if (lowStockOnly) list = list.filter(p => p.stockQty <= LOW_STOCK_THRESHOLD);

    // Tri
    list.sort((a, b) => {
      let va: string | number = a[sortKey] as string | number;
      let vb: string | number = b[sortKey] as string | number;
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [products, search, catFilter, availFilter, lowStockOnly, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page quand filtres changent
  useEffect(() => { setPage(1); }, [search, catFilter, availFilter, lowStockOnly, pageSize]);

  /* ── Tri colonnes ────────────────────────────────────────────── */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
      : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
  };

  /* ── Formulaire ──────────────────────────────────────────────── */
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const openNew  = () => { setEditing(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? "", price: p.price,
      category: p.category, available: p.available, stockQty: p.stockQty,
      photoUrl: p.photoUrl ?? "", tiktokCode: p.tiktokCode ?? "" });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim() || Number(form.price) <= 0) {
      toast({ title: "Champs requis", description: "Nom, catégorie et prix sont obligatoires.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url    = editing ? `/products/${editing.id}` : "/products";
      const method = editing ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ ...form, price: Number(form.price), stockQty: Number(form.stockQty) }),
      });
      if (res.ok) {
        toast({ title: editing ? "Produit mis à jour ✅" : "Produit créé ✅" });
        setFormOpen(false);
        fetchProducts();
      } else {
        const d = await res.json();
        toast({ title: "Erreur", description: d.message ?? d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ── Suppression ─────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await apiFetch(`/products/${deleteId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setProducts(p => p.filter(x => x.id !== deleteId));
        toast({ title: "Produit supprimé" });
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── En-tête ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
              <Boxes className="h-6 w-6 text-primary" /> Produits
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gérez l'ensemble de votre catalogue produits — StockShop
            </p>
          </div>
          <Button onClick={openNew} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Nouveau produit
          </Button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: Package,       label: "Total produits",  value: loading ? "—" : String(stats.total),          color: "text-foreground" },
            { icon: BarChart3,     label: "Produits actifs", value: loading ? "—" : String(stats.actifs),         color: "text-green-500" },
            { icon: TrendingDown,  label: "En rupture",      value: loading ? "—" : String(stats.rupture),        color: "text-destructive" },
            { icon: AlertTriangle, label: "Stock faible",    value: loading ? "—" : String(stats.stockFaible),    color: "text-orange-500" },
            { icon: Tag,           label: "Valeur du stock", value: loading ? "—" : formatFCFA(stats.valeur),     color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              {loading
                ? <Skeleton className="h-6 w-20" />
                : <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>}
            </div>
          ))}
        </div>

        {/* ── Filtres & Recherche ── */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou SKU..."
              className="pl-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtre catégorie */}
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes catégories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Filtre disponibilité */}
          <Select value={availFilter} onValueChange={setAvailFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Disponibilité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes</SelectItem>
              <SelectItem value="available">Disponibles</SelectItem>
              <SelectItem value="unavailable">Indisponibles</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtre stock faible */}
          <label className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted transition-colors">
            <Switch
              checked={lowStockOnly}
              onCheckedChange={setLowStockOnly}
              className="scale-75"
            />
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
            Stock faible
          </label>

          {/* Résultat count */}
          {!loading && (
            <span className="text-sm text-muted-foreground ml-auto">
              {filtered.length} produit{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── Tableau ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12" />
                  <TableHead>
                    <button onClick={() => handleSort("name")} className="flex items-center gap-1.5 font-semibold hover:text-foreground">
                      Nom <SortIcon col="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("category")} className="flex items-center gap-1.5 font-semibold hover:text-foreground">
                      Catégorie <SortIcon col="category" />
                    </button>
                  </TableHead>
                  <TableHead>SKU / TikTok</TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("price")} className="flex items-center gap-1.5 font-semibold hover:text-foreground">
                      Prix <SortIcon col="price" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("stockQty")} className="flex items-center gap-1.5 font-semibold hover:text-foreground">
                      Stock <SortIcon col="stockQty" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("available")} className="flex items-center gap-1.5 font-semibold hover:text-foreground">
                      Statut <SortIcon col="available" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Package className="h-10 w-10 opacity-30" />
                        <p className="font-medium">Aucun produit trouvé</p>
                        <p className="text-xs">Modifiez vos filtres ou ajoutez un nouveau produit.</p>
                        <Button variant="outline" size="sm" onClick={openNew} className="gap-2 mt-1">
                          <Plus className="h-3.5 w-3.5" /> Ajouter un produit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map(product => {
                    const isLow    = product.stockQty > 0 && product.stockQty <= LOW_STOCK_THRESHOLD;
                    const isOut    = product.stockQty === 0;
                    return (
                      <TableRow key={product.id} className="group">
                        {/* Photo */}
                        <TableCell className="w-12 py-2">
                          {product.photoUrl ? (
                            <img src={product.photoUrl} alt={product.name}
                              className="h-9 w-9 rounded-lg object-cover border border-border" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                              <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </TableCell>

                        {/* Nom */}
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</p>
                            )}
                          </div>
                        </TableCell>

                        {/* Catégorie */}
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {product.category}
                          </Badge>
                        </TableCell>

                        {/* SKU */}
                        <TableCell>
                          {product.tiktokCode ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {product.tiktokCode}
                            </code>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </TableCell>

                        {/* Prix */}
                        <TableCell className="font-semibold text-sm text-primary">
                          {formatFCFA(product.price)}
                        </TableCell>

                        {/* Stock */}
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                            isOut ? "text-destructive" : isLow ? "text-orange-500" : "text-foreground"
                          }`}>
                            {isOut && <AlertTriangle className="h-3.5 w-3.5" />}
                            {isLow && !isOut && <TrendingDown className="h-3.5 w-3.5" />}
                            {product.stockQty}
                          </span>
                        </TableCell>

                        {/* Statut */}
                        <TableCell>
                          <Badge className={`text-xs ${product.available
                            ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
                            : "bg-muted text-muted-foreground border-border"}`}>
                            {product.available ? "Disponible" : "Indisponible"}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setDetail(product); setDetailOpen(true); }}
                              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Voir détails"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openEdit(product)}
                              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteId(product.id)}
                              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ── */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Lignes par page :</span>
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} sur {filtered.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialog Création / Modification ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {editing ? "Modifier le produit" : "Nouveau produit"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            {/* Nom */}
            <div>
              <Label>Nom <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} className="mt-1" placeholder="Ex: Poulet rôti" />
            </div>

            {/* Catégorie + Prix */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Catégorie <span className="text-destructive">*</span></Label>
                <Input value={form.category} onChange={e => set("category", e.target.value)} className="mt-1" placeholder="Ex: Plats, Boissons" />
              </div>
              <div>
                <Label>Prix (FCFA) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} value={form.price} onChange={e => set("price", e.target.value)} className="mt-1" />
              </div>
            </div>

            {/* Stock + SKU */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantité initiale</Label>
                <Input type="number" min={0} value={form.stockQty} onChange={e => set("stockQty", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>SKU / Code TikTok Live</Label>
                <Input
                  value={form.tiktokCode ?? ""}
                  onChange={e => set("tiktokCode", e.target.value.toUpperCase())}
                  placeholder="Ex: PLT001"
                  className="mt-1 font-mono uppercase"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)} rows={2} className="mt-1" />
            </div>

            {/* Photo URL */}
            <div>
              <Label>URL de l'image</Label>
              <Input value={form.photoUrl ?? ""} onChange={e => set("photoUrl", e.target.value)} placeholder="https://..." className="mt-1" />
              {form.photoUrl && (
                <img src={form.photoUrl} alt="aperçu" className="mt-2 h-20 w-20 rounded-lg object-cover border border-border" />
              )}
            </div>

            {/* Disponibilité */}
            <div className="flex items-center gap-2.5 pt-1">
              <Switch checked={form.available} onCheckedChange={v => set("available", v)} />
              <Label>Disponible à la commande</Label>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? "Enregistrement..." : editing ? "Mettre à jour" : "Créer le produit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Drawer Détail produit ── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detail && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="font-serif text-xl">{detail.name}</SheetTitle>
              </SheetHeader>

              {/* Photo */}
              {detail.photoUrl ? (
                <img src={detail.photoUrl} alt={detail.name} className="w-full h-48 object-cover rounded-xl border border-border mb-6" />
              ) : (
                <div className="w-full h-48 rounded-xl bg-muted flex items-center justify-center mb-6 border border-border">
                  <ImageOff className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}

              {/* Infos */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoBlock label="Catégorie"    value={detail.category} />
                  <InfoBlock label="Prix"         value={formatFCFA(detail.price)} accent />
                  <InfoBlock label="Stock"        value={String(detail.stockQty)}
                    accent={detail.stockQty === 0}
                    warning={detail.stockQty > 0 && detail.stockQty <= LOW_STOCK_THRESHOLD} />
                  <InfoBlock label="SKU / TikTok" value={detail.tiktokCode || "—"} mono />
                  <InfoBlock
                    label="Statut"
                    value={detail.available ? "Disponible" : "Indisponible"}
                    green={detail.available}
                  />
                  <InfoBlock label="Valeur stock" value={formatFCFA(detail.price * detail.stockQty)} />
                </div>

                {detail.description && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Description</p>
                    <p className="text-sm">{detail.description}</p>
                  </div>
                )}

                {/* Historique mouvements (placeholder) */}
                <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <ArrowUpDown className="h-3 w-3" /> Historique des mouvements
                  </p>
                  <p className="text-xs text-muted-foreground/60 text-center py-4">
                    Connexion au module Inventaire requise
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { setDetailOpen(false); openEdit(detail); }}>
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
                <Button variant="destructive" className="gap-2" onClick={() => { setDetailOpen(false); setDeleteId(detail.id); }}>
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Confirmation suppression ── */}
      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le produit sera définitivement supprimé du catalogue et du stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

/* ── Composant utilitaire InfoBlock ── */
function InfoBlock({ label, value, accent, warning, green, mono }: {
  label: string; value: string;
  accent?: boolean; warning?: boolean; green?: boolean; mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm font-semibold ${mono ? "font-mono" : ""} ${
        accent  ? "text-primary"     :
        warning ? "text-orange-500"  :
        green   ? "text-green-500"   :
        "text-foreground"
      }`}>
        {value}
      </p>
    </div>
  );
}
