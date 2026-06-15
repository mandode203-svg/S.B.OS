
import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { formatFCFA } from "@/lib/utils";
import {
  ShoppingCart, Plus, Minus, ChefHat, X, CheckCircle2,
  Loader2, MapPin, CreditCard, MessageCircle, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  photoUrl?: string | null;
  available: boolean;
  stockQty?: number;
}

interface Business {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  logoUrl?: string | null;
  products: Product[];
}

interface CartItem extends Product {
  quantity: number;
}

interface PlacedOrder {
  id: string;
  total: number;
  depositAmount: number;
  paymentUrl?: string | null;
}

export default function OrderPage() {
  const params = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({
    clientName: "", clientPhone: "", clientEmail: "", orderType: "dine-in", notes: "",
  });

  useEffect(() => {
    fetch(`/api/business/${params.slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setBusiness(d); setLoading(false); });
  }, [params.slug]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      if (existing) return prev.map(c => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...product, quantity: 1 }];
    });
    toast({ title: `${product.name} ajouté`, description: formatFCFA(product.price) });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.id === id ? { ...c, quantity: c.quantity + delta } : c)
      .filter(c => c.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  // Acompte 25% calculé automatiquement — lecture seule
  const depositAmount = Math.round(cartTotal * 0.25);
  const remainingAmount = cartTotal - depositAmount;

  const categories = [...new Set(business?.products.map(p => p.category) ?? [])];

  const setF = (k: string, v: string) => setCustomerForm(f => ({ ...f, [k]: v }));

  const handleOrder = async () => {
    if (!customerForm.clientName || !customerForm.clientPhone) {
      toast({ title: "Erreur", description: "Nom et téléphone sont requis", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "Panier vide", description: "Ajoutez des articles avant de commander", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business!.id,
          clientName: customerForm.clientName,
          clientPhone: customerForm.clientPhone,
          clientEmail: customerForm.clientEmail || undefined,
          items: cart.map(c => ({ productId: c.id, name: c.name, price: c.price, quantity: c.quantity })),
          total: cartTotal,
          orderType: customerForm.orderType,
          notes: customerForm.notes || undefined,
        }),
      });

      if (res.ok) {
        const order = await res.json() as PlacedOrder;
        setPlacedOrder(order);
        setCheckoutOpen(false);
        setSuccessOpen(true);
        setCart([]);

        // Rediriger automatiquement vers FedaPay si le lien est disponible
        if (order.paymentUrl) {
          setTimeout(() => {
            window.location.href = order.paymentUrl!;
          }, 2500);
        }
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: "Erreur", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Connexion impossible, réessayez", variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!business) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <ChefHat className="w-12 h-12 text-muted-foreground" />
      <p className="text-muted-foreground">Établissement introuvable</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* ── En-tête entreprise ── */}
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-3">
          {business.logoUrl ? (
            <img src={business.logoUrl} alt={business.name} className="w-12 h-12 rounded object-cover" />
          ) : (
            <div className="w-12 h-12 rounded bg-primary/15 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-serif font-bold">{business.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {business.type}{business.address ? ` · ${business.address}` : ""}
            </p>
          </div>
        </div>

        {/* ── Filtre catégories ── */}
        {categories.length > 1 && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeCategory === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              Tout
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bandeau acompte info ── */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-primary/10 border border-primary/20 rounded p-3 flex items-start gap-2">
          <CreditCard className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Paiement sécurisé :</span> un acompte de{" "}
            <span className="text-primary font-semibold">25%</span> est requis pour confirmer votre commande.
            Le reste est réglé à la livraison.
          </p>
        </div>
      </div>

      {/* ── Liste des produits ── */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-8">
        {categories
          .filter(cat => activeCategory === null || cat === activeCategory)
          .map(cat => {
            const items = business.products.filter(p => p.category === cat && p.available);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h2>
                <div className="space-y-2">
                  {items.map(product => {
                    const inCart = cart.find(c => c.id === product.id);
                    const lowStock = typeof product.stockQty === "number" && product.stockQty > 0 && product.stockQty <= 5;
                    return (
                      <div key={product.id} className="bg-card border border-border rounded p-4 flex gap-3">
                        {product.photoUrl && (
                          <img src={product.photoUrl} alt={product.name} className="w-16 h-16 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className="font-medium leading-tight">{product.name}</p>
                            {lowStock && (
                              <span className="flex-shrink-0 text-[10px] bg-orange-500/15 text-orange-400 rounded px-1.5 py-0.5 font-medium">
                                Stock limité
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
                          )}
                          <p className="text-sm font-semibold text-primary mt-1">{formatFCFA(product.price)}</p>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-2 flex-shrink-0 self-end">
                            <button
                              onClick={() => updateQty(product.id, -1)}
                              className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-muted/80"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-semibold w-5 text-center">{inCart.quantity}</span>
                            <button
                              onClick={() => updateQty(product.id, 1)}
                              className="w-7 h-7 rounded bg-primary flex items-center justify-center hover:opacity-90"
                            >
                              <Plus className="w-3 h-3 text-primary-foreground" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="w-8 h-8 rounded bg-primary flex items-center justify-center hover:opacity-90 self-end flex-shrink-0"
                          >
                            <Plus className="w-4 h-4 text-primary-foreground" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* ── Bouton panier fixe ── */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t border-border backdrop-blur">
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Acompte (25%) à payer maintenant</span>
              <span className="text-primary font-semibold">{formatFCFA(depositAmount)}</span>
            </div>
            <Button onClick={() => setCheckoutOpen(true)} className="w-full h-12 text-base gap-3">
              <ShoppingCart className="w-5 h-5" />
              Commander ({cartCount}) · {formatFCFA(cartTotal)}
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialog checkout ── */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Votre commande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Récapitulatif panier */}
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFCFA(item.price)} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold w-20 text-right">{formatFCFA(item.price * item.quantity)}</span>
                </div>
              ))}

              {/* Totaux */}
              <div className="border-t border-border pt-2 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total commande</span>
                  <span className="font-semibold">{formatFCFA(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Acompte 25% (à payer maintenant)</span>
                  <span className="font-semibold text-primary">{formatFCFA(depositAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reste à la livraison</span>
                  <span className="font-semibold text-muted-foreground">{formatFCFA(remainingAmount)}</span>
                </div>
              </div>
            </div>

            {/* Formulaire client */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Votre nom *</Label>
                  <Input value={customerForm.clientName} onChange={e => setF("clientName", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Téléphone *</Label>
                  <Input
                    value={customerForm.clientPhone}
                    onChange={e => setF("clientPhone", e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Email (optionnel)</Label>
                <Input
                  type="email"
                  value={customerForm.clientEmail}
                  onChange={e => setF("clientEmail", e.target.value)}
                  placeholder="votre@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Type de commande</Label>
                <Select value={customerForm.orderType} onValueChange={v => setF("orderType", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine-in">Sur place</SelectItem>
                    <SelectItem value="takeaway">À emporter</SelectItem>
                    <SelectItem value="delivery">Livraison</SelectItem>
                    <SelectItem value="preorder">Pré-commande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes / instructions</Label>
                <Textarea
                  value={customerForm.notes}
                  onChange={e => setF("notes", e.target.value)}
                  rows={2}
                  placeholder="Allergies, adresse de livraison, préférences..."
                  className="mt-1"
                />
              </div>
            </div>

            {/* Info acompte */}
            <div className="bg-primary/10 border border-primary/20 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Paiement sécurisé</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Vous serez redirigé vers FedaPay pour payer votre acompte de{" "}
                <span className="text-primary font-semibold">{formatFCFA(depositAmount)}</span>.
                Le reste ({formatFCFA(remainingAmount)}) est réglé à la réception.
              </p>
            </div>

            <Button onClick={handleOrder} className="w-full h-11" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Envoi en cours...</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" /> Payer l'acompte · {formatFCFA(depositAmount)}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog succès + redirect paiement ── */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="text-center max-w-sm">
          <div className="py-6">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-serif font-bold mb-2">Commande enregistrée !</h2>

            {placedOrder?.paymentUrl ? (
              <>
                <p className="text-sm text-muted-foreground mb-1">
                  Vous êtes redirigé vers le paiement dans quelques secondes…
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Acompte à payer : <span className="text-primary font-semibold">{formatFCFA(placedOrder.depositAmount)}</span>
                </p>
                <a
                  href={placedOrder.paymentUrl}
                  className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity mb-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Payer l'acompte maintenant
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Votre commande a été reçue. Un message WhatsApp vous a été envoyé avec les détails.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-green-400 mb-4">
                  <MessageCircle className="w-4 h-4" />
                  <span>Confirmation WhatsApp envoyée</span>
                </div>
              </>
            )}

            {placedOrder?.id && (
              <p className="text-xs text-muted-foreground bg-muted rounded p-2 font-mono mb-4">
                Réf: {placedOrder.id.slice(0, 8).toUpperCase()}
              </p>
            )}

            {placedOrder?.id && params.slug && (
              <Link
                href={`/order/${params.slug}/track/${placedOrder.id}`}
                onClick={() => setSuccessOpen(false)}
                className="flex items-center justify-center gap-2 w-full border border-border rounded px-4 py-2.5 text-sm hover:bg-card transition-colors mb-2"
              >
                <MapPin className="w-4 h-4" />
                Suivre ma commande →
              </Link>
            )}

            <Button variant="ghost" onClick={() => setSuccessOpen(false)} className="w-full text-muted-foreground text-sm">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
