import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { ShoppingBag, CalendarRange, MessageCircle, ChefHat, ArrowRight, Loader2, LockKeyhole } from "lucide-react";

interface StoreInfo {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

export default function StorePortalPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [, navigate] = useLocation();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/storefront/${storeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setStore(data);
        else setError("Établissement introuvable");
      })
      .catch(() => setError("Impossible de charger la boutique"))
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A08] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-[#0B0A08] flex items-center justify-center px-4">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-white font-serif text-xl mb-2">Oops…</p>
          <p className="text-white/50 text-sm">{error || "Boutique introuvable"}</p>
        </div>
      </div>
    );
  }

  // Boutique désactivée par l'admin
  if (!store.active) {
    return (
      <div className="min-h-screen bg-[#0B0A08] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <LockKeyhole className="w-9 h-9 text-white/30" />
          </div>
          <h1 className="text-xl font-serif font-bold text-white mb-2">{store.name}</h1>
          <p className="text-sm text-white/40 mb-1">Boutique temporairement fermée</p>
          <p className="text-xs text-white/25 leading-relaxed">
            Cet établissement est momentanément indisponible. Veuillez réessayer ultérieurement ou contacter directement le commerce.
          </p>
        </div>
        <div className="absolute bottom-6">
          <p className="text-[11px] text-white/20">
            Propulsé par <span className="text-primary/50 font-medium">SmartOrder AI</span>
          </p>
        </div>
      </div>
    );
  }

  const actions = [
    {
      icon: ShoppingBag,
      title: "Voir le Catalogue",
      description: "Parcourez nos produits et passez une commande",
      color: "from-amber-500/20 to-amber-600/10",
      border: "border-amber-500/30",
      iconColor: "text-amber-400",
      onClick: () => navigate(`/store/${storeId}/catalog`),
    },
    {
      icon: CalendarRange,
      title: "Faire une Réservation",
      description: "Réservez une table ou un créneau en ligne",
      color: "from-blue-500/20 to-blue-600/10",
      border: "border-blue-500/30",
      iconColor: "text-blue-400",
      onClick: () => navigate(`/book/${storeId}`),
    },
    {
      icon: MessageCircle,
      title: "Chat avec l'Assistant",
      description: "Discutez avec notre assistant IA en temps réel",
      color: "from-emerald-500/20 to-emerald-600/10",
      border: "border-emerald-500/30",
      iconColor: "text-emerald-400",
      onClick: () => navigate(`/store/${storeId}/chat`),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0A08] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 mb-4">
          <ChefHat className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-white mb-1">{store.name}</h1>
        <p className="text-sm text-white/40 capitalize">{store.type}</p>
      </div>

      {/* Actions */}
      <div className="flex-1 px-5 pb-8 space-y-3 max-w-md mx-auto w-full">
        <p className="text-xs text-white/30 text-center uppercase tracking-widest mb-5">
          Comment pouvons-nous vous aider ?
        </p>

        {actions.map(({ icon: Icon, title, description, color, border, iconColor, onClick }) => (
          <button
            key={title}
            onClick={onClick}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border ${border} bg-gradient-to-br ${color}
              hover:scale-[1.02] active:scale-[0.99] transition-transform duration-150 text-left`}
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center pb-6">
        <p className="text-[11px] text-white/20">
          Propulsé par <span className="text-primary/60 font-medium">SmartOrder AI</span>
        </p>
      </div>
    </div>
  );
}
