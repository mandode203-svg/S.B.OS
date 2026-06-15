import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { Link } from "wouter";
import { formatFCFA } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart, Plus, Minus, ChefHat, X,
  CheckCircle2, Loader2, ArrowRight, MapPin,
  Phone, User, Utensils, Package, Bike, Clock, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  photoUrl?: string | null;
  available: boolean;
}

interface Store {
  id: string;
  name: string;
  type: string;
  active: boolean;
  products: Product[];
}

interface CartItem extends Product {
  quantity: number;
}

type OrderType = "dine-in" | "takeaway" | "delivery" | "preorder";

const ORDER_TYPES: { value: OrderType; label: string; icon: React.ElementType }[] = [
  { value: "dine-in",  label: "Sur place",   icon: Utensils },
  { value: "takeaway", label: "À emporter",  icon: Package  },
  { value: "delivery", label: "Livraison",   icon: Bike     },
  { value: "preorder", label: "Pré-commande",icon: Clock    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StorefrontPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { toast } = useToast();

  const [store, setStore]         = useState<Store | null>(null);
  const [loading, setLoading]     = useState(true);
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [cartOpen, setCartOpen]   = useState(false);
  const [step, setStep]           = useState<"cart" | "info" | "success">("cart");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId]     = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [form, setForm]           = useState({
    name: "", phone: "", orderType: "dine-in" as OrderType, notes: "",
  });

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabsRef      = useRef<HTMLDivElement | null>(null);

  // ── Load store ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/storefront/${storeId}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: Store | null) => {
        setStore(d);
        if (d?.products?.length) {
          const cats = [...new Set(d.products.map(p => p.category))];
          setActiveCategory(cats[0] ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  // ── Cart helpers ────────────────────────────────────────────────────────────

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
  const categories = [...new Set(store?.products.map(p => p.category) ?? [])];

  // ── Category tab click ──────────────────────────────────────────────────────

  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat);
    categoryRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Submit order ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: "Erreur", description: "Nom et téléphone requis", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId:  storeId,
          clientName:  form.name.trim(),
          clientPhone: form.phone.trim(),
          items:       cart.map(c => ({ productId: c.id, name: c.name, price: c.price, quantity: c.quantity })),
          total:       cartTotal,
          orderType:   form.orderType,
          notes:       form.notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const order = await res.json() as { id: string; paymentUrl?: string | null; depositAmount?: number };
        setOrderId(order.id);
        setDepositAmount(order.depositAmount ?? Math.round(cartTotal * 0.25));
        setPaymentUrl(order.paymentUrl ?? null);
        setStep("success");
        setCart([]);
        // Si lien de paiement disponible, rediriger après 2s
        if (order.paymentUrl) {
          setTimeout(() => { window.location.href = order.paymentUrl!; }, 2000);
        }
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: "Erreur", description: d.error ?? "Impossible d'envoyer la commande", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / not found ─────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
    </div>
  );

  if (!store) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <ChefHat className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">Établissement introuvable</h2>
      <p className="text-sm text-muted-foreground">Ce lien ne correspond à aucune boutique active.</p>
    </div>
  );

  const inCart = (id: string) => cart.find(c => c.id === id);

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-7 h-7 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-serif font-bold truncate">{store.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{store.type}</p>
          </div>
        </div>

        {/* Sticky category tabs */}
        {categories.length > 1 && (
          <div
            ref={tabsRef}
            className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar"
            style={{ scrollbarWidth: "none" }}
          >
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Product list ─────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-8">
        {categories.map(cat => {
          const items = store.products.filter(p => p.category === cat);
          if (!items.length) return null;
          return (
            <div
              key={cat}
              ref={el => { categoryRefs.current[cat] = el; }}
            >
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
                {cat}
              </h2>
              <div className="space-y-3">
                {items.map(product => {
                  const qty = inCart(product.id)?.quantity ?? 0;
                  return (
                    <div
                      key={product.id}
                      className="bg-card border border-border rounded-xl overflow-hidden flex gap-3 p-3"
                    >
                      {/* Photo */}
                      {product.photoUrl ? (
                        <img
                          src={product.photoUrl}
                          alt={product.name}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <ChefHat className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="font-semibold text-sm leading-tight">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-primary">{formatFCFA(product.price)}</span>

                          {/* Qty controls */}
                          {qty > 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQty(product.id, -1)}
                                className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-transform"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-bold w-4 text-center tabular-nums">{qty}</span>
                              <button
                                onClick={() => addToCart(product)}
                                className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center active:scale-95 transition-transform"
                              >
                                <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center active:scale-95 transition-transform shadow-sm shadow-primary/30"
                            >
                              <Plus className="w-4 h-4 text-primary-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucun produit disponible pour l'instant.</p>
          </div>
        )}
      </div>

      {/* ── Floating cart button ─────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-40">
          <button
            onClick={() => { setStep("cart"); setCartOpen(true); }}
            className="flex items-center gap-3 bg-primary text-primary-foreground px-5 py-3.5 rounded-2xl shadow-lg shadow-primary/30 font-semibold text-sm active:scale-95 transition-transform max-w-sm w-full"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-background text-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            </div>
            <span className="flex-1 text-left">Voir mon panier</span>
            <span className="font-bold">{formatFCFA(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* ── Cart / Checkout panel ─────────────────────────────────────────────── */}
      {cartOpen && step !== "success" && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />

          {/* Panel */}
          <div className="bg-card border-t border-border rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">

            {/* Handle + Header */}
            <div className="flex-shrink-0 px-4 pt-3 pb-0">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="font-serif font-bold text-base">
                  {step === "cart" ? "Mon panier" : "Informations"}
                </h2>
                <button
                  onClick={() => setCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {step === "cart" && (
                <>
                  {/* Cart items */}
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFCFA(item.price)} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold w-4 text-center tabular-nums">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-primary w-20 text-right tabular-nums">
                          {formatFCFA(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center border-t border-border pt-3">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold text-primary">{formatFCFA(cartTotal)}</span>
                  </div>
                </>
              )}

              {step === "info" && (
                <div className="space-y-4">
                  {/* Order recap */}
                  <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground">
                    {cart.length} article{cart.length > 1 ? "s" : ""} · <span className="text-primary font-semibold">{formatFCFA(cartTotal)}</span>
                  </div>

                  {/* Customer fields */}
                  <div>
                    <Label className="text-xs">Votre nom <span className="text-destructive">*</span></Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="ex: Mamadou Diallo"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Téléphone WhatsApp <span className="text-destructive">*</span></Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+221 77 000 00 00"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Order type */}
                  <div>
                    <Label className="text-xs block mb-2">Type de commande</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ORDER_TYPES.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => setForm(f => ({ ...f, orderType: value }))}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                            form.orderType === value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-muted-foreground"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="text-xs">Notes / instructions (optionnel)</Label>
                    <Textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Allergies, instructions de livraison…"
                      rows={2}
                      className="mt-1 text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CTA footer */}
            <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-border space-y-2">
              {step === "cart" ? (
                <>
                  <Button
                    className="w-full h-12 text-base gap-2 rounded-xl"
                    onClick={() => setStep("info")}
                    disabled={cart.length === 0}
                  >
                    Continuer
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="w-full text-center text-sm text-muted-foreground py-2"
                  >
                    Continuer mes achats
                  </button>
                </>
              ) : (
                <>
                  <Button
                    className="w-full h-12 text-base rounded-xl gap-2"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                      : `Commander · ${formatFCFA(cartTotal)}`
                    }
                  </Button>
                  <button
                    onClick={() => setStep("cart")}
                    className="w-full text-center text-sm text-muted-foreground py-2"
                  >
                    ← Retour au panier
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Success screen ───────────────────────────────────────────────────── */}
      {step === "success" && cartOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2">Commande enregistrée !</h2>
          <p className="text-muted-foreground text-sm mb-2">
            {store.name} a bien reçu votre commande.
          </p>
          {orderId && (
            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 font-mono mb-4">
              Référence : {orderId.slice(0, 8).toUpperCase()}
            </p>
          )}

          {/* Bloc paiement acompte */}
          {paymentUrl ? (
            <div className="w-full max-w-xs bg-card border border-border rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-muted-foreground mb-1">Acompte à payer (25%)</p>
              <p className="text-xl font-bold text-primary mb-3">
                {depositAmount.toLocaleString("fr-FR")} FCFA
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Vous allez être redirigé vers le paiement…
              </p>
              <a
                href={paymentUrl}
                className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                💳 Payer l'acompte maintenant
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-green-400 mb-6">
              <MessageCircle className="w-4 h-4" />
              <span>Confirmation WhatsApp envoyée</span>
            </div>
          )}

          <div className="w-full max-w-xs space-y-3">
            {orderId && (
              <Link
                href={`/store/${storeId}/track/${orderId}`}
                onClick={() => setCartOpen(false)}
                className="flex items-center justify-center gap-2 w-full border border-border text-foreground rounded-xl px-4 py-3 text-sm font-semibold hover:bg-card transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Suivre ma commande
              </Link>
            )}
            <button
              onClick={() => { setCartOpen(false); setStep("cart"); setPaymentUrl(null); }}
              className="w-full text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
            >
              Commander autre chose
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
