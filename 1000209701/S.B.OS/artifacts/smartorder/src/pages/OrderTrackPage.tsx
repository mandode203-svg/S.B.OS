import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import type { Socket } from "socket.io-client";
import { createSocket } from "@/lib/socket";
import { apiFetch } from "@/lib/apiFetch";
import { formatFCFA } from "@/lib/utils";
import { ChefHat, Loader2, AlertTriangle, ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  businessId: string;
  clientName: string;
  clientPhone: string;
  items: OrderItem[];
  total: number;
  depositAmount: number;
  status: string;
  orderType: string;
  scheduledAt: string | null;
  notes: string | null;
  createdAt: string;
}

const TIMELINE = [
  {
    value: "reçue",
    label: "Commande reçue",
    desc: "Votre commande a bien été enregistrée.",
    icon: "📋",
    color: "#3B82F6",
  },
  {
    value: "confirmée",
    label: "Commande confirmée",
    desc: "L'établissement a accepté votre commande.",
    icon: "✅",
    color: "#EAB308",
  },
  {
    value: "en_preparation",
    label: "En préparation",
    desc: "Votre commande est en cours de préparation.",
    icon: "👨‍🍳",
    color: "#F97316",
  },
  {
    value: "prête",
    label: "Prête",
    desc: "Votre commande est prête !",
    icon: "🔔",
    color: "#22C55E",
  },
  {
    value: "livrée",
    label: "Livrée / Terminée",
    desc: "Commande complétée. Merci pour votre confiance !",
    icon: "🎉",
    color: "#E8A325",
  },
];

const ORDER_TYPE_LABELS: Record<string, string> = {
  "dine-in": "Sur place",
  "takeaway": "À emporter",
  "delivery": "Livraison",
  "preorder": "Pré-commande",
};

function stepIndex(status: string) {
  return TIMELINE.findIndex(s => s.value === status);
}

export default function OrderTrackPage() {
  const slugParams  = useParams<{ slug: string;    orderId: string }>();
  const storeParams = useParams<{ storeId: string; orderId: string }>();
  const slug    = slugParams.slug    ?? storeParams.storeId ?? "";
  const orderId = slugParams.orderId ?? storeParams.orderId ?? "";
  const isStoreRoute = !slugParams.slug && !!storeParams.storeId;
  const backHref = isStoreRoute ? `/store/${slug}` : `/order/${slug}`;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    apiFetch(`/api/orders/${orderId}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data: Order | null) => {
        if (!data) return;
        setOrder(data);
        setLoading(false);

        const socket = createSocket();
        socketRef.current = socket;
        socket.emit("join", data.businessId);
        socket.on("order:updated", (updated: Order) => {
          if (updated.id === data.id) setOrder(updated);
        });
      });

    return () => { socketRef.current?.disconnect(); };
  }, [orderId]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (notFound || !order) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="w-12 h-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Commande introuvable</h2>
      <p className="text-sm text-muted-foreground">Vérifiez le lien ou contactez l'établissement.</p>
      <Link href={backHref} className="text-primary text-sm hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Retour au menu
      </Link>
    </div>
  );

  const isCancelled = order.status === "annulée";
  const currentStep = stepIndex(order.status);
  const isTerminal = order.status === "livrée" || isCancelled;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={backHref} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded bg-primary/15 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">Suivi de commande</p>
              <p className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          {!isTerminal && (
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              En direct
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {isCancelled && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Commande annulée</p>
              <p className="text-xs text-muted-foreground mt-0.5">Cette commande a été annulée. Contactez l'établissement pour plus d'informations.</p>
            </div>
          </div>
        )}

        {order.status === "livrée" && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-400">Commande complétée 🎉</p>
              <p className="text-xs text-muted-foreground mt-0.5">Merci pour votre commande. À bientôt !</p>
            </div>
          </div>
        )}

        {!isCancelled && (
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-5">État de votre commande</h3>
            <div className="space-y-0">
              {TIMELINE.map((step, idx) => {
                const isDone = currentStep > idx;
                const isActive = currentStep === idx;
                return (
                  <div key={step.value} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm transition-all duration-500"
                        style={{
                          background: isDone || isActive ? `${step.color}20` : "rgba(250,245,232,0.04)",
                          border: `2px solid ${isDone || isActive ? step.color : "rgba(250,245,232,0.1)"}`,
                          boxShadow: isActive ? `0 0 12px ${step.color}50` : "none",
                        }}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4" style={{ color: step.color }} />
                        ) : isActive ? (
                          <span>{step.icon}</span>
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
                        )}
                      </div>
                      {idx < TIMELINE.length - 1 && (
                        <div
                          className="w-0.5 flex-1 my-1 transition-all duration-500"
                          style={{
                            background: isDone
                              ? `linear-gradient(to bottom, ${step.color}, ${TIMELINE[idx + 1].color})`
                              : "rgba(250,245,232,0.07)",
                            minHeight: 24,
                          }}
                        />
                      )}
                    </div>
                    <div className="pb-5 flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold leading-tight"
                        style={{
                          color: isDone ? "rgba(250,245,232,0.5)" : isActive ? "var(--foreground, #FAF5E8)" : "rgba(250,245,232,0.25)",
                        }}
                      >
                        {step.label}
                        {isActive && (
                          <span
                            className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{ background: `${step.color}20`, color: step.color }}
                          >
                            En cours
                          </span>
                        )}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: isActive ? "rgba(250,245,232,0.5)" : "rgba(250,245,232,0.2)" }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Détails de la commande</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType} · {new Date(order.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-mono flex-shrink-0">#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs bg-primary/10 text-primary font-semibold rounded px-1.5 py-0.5 flex-shrink-0">
                  ×{item.quantity}
                </span>
                <span className="text-sm flex-1 min-w-0 truncate">{item.name}</span>
                <span className="text-sm font-semibold text-primary flex-shrink-0">{formatFCFA(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          {order.notes && (
            <div className="bg-muted/40 rounded p-2.5 text-xs text-muted-foreground border-l-2 border-primary/30">
              <span className="font-medium text-foreground">Note : </span>{order.notes}
            </div>
          )}
          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-primary">{formatFCFA(order.total)}</span>
            </div>
            {order.depositAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Acompte</span>
                <span className="font-semibold text-green-400">{formatFCFA(order.depositAmount)} versé</span>
              </div>
            )}
            {order.depositAmount > 0 && order.total > order.depositAmount && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reste à payer</span>
                <span className="font-semibold">{formatFCFA(order.total - order.depositAmount)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3">Informations client</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 flex-shrink-0">Nom</span>
              <span className="font-medium">{order.clientName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 flex-shrink-0">Téléphone</span>
              <span className="font-medium">{order.clientPhone}</span>
            </div>
          </div>
        </div>

        <div className="text-center pb-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au menu
          </Link>
        </div>
      </div>
    </div>
  );
          }
