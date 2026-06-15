import { X, Lock, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PlanName } from "@/hooks/usePlan";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  requiredPlan?: "business" | "pro";
  featureName?: string;
}

const PLANS = [
  {
    name: "Business" as const,
    price: "25 000 FCFA/mois",
    features: [
      "Jusqu'à 100 produits au catalogue",
      "2 employés",
      "Commandes & réservations illimitées",
      "Assistant IA inclus",
      "Onglet Paiements actif",
    ],
    locked: ["Marketing & campagnes"],
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/5",
  },
  {
    name: "Pro / Premium" as const,
    price: "55 000 FCFA/mois",
    features: [
      "Produits & employés illimités",
      "Marketing & campagnes SMS/WhatsApp",
      "Paiements intégrés (FedaPay, Wave…)",
      "Assistant IA avancé",
      "Rapports complets",
      "Priorité support",
    ],
    locked: [],
    color: "text-primary",
    borderColor: "border-primary/40",
    bgColor: "bg-primary/5",
    recommended: true,
  },
];

export default function UpgradeModal({ open, onClose, featureName }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-start justify-between z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-primary" />
              </div>
              <h2 className="text-base font-serif font-bold">Passez à la version supérieure</h2>
            </div>
            {featureName && (
              <p className="text-xs text-muted-foreground">
                <span className="text-primary font-medium">{featureName}</span> est disponible sur les plans payants.
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-4">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-4 ${plan.borderColor} ${plan.bgColor}`}
            >
              {plan.recommended && (
                <span className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Recommandé
                </span>
              )}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`text-sm font-bold ${plan.color}`}>{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.price}</p>
                </div>
                <Zap className={`w-5 h-5 ${plan.color}`} />
              </div>
              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                    <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* CTA */}
          <div className="pt-2 space-y-2">
            <Button className="w-full gap-2" onClick={onClose}>
              <Zap className="w-4 h-4" />
              Contacter l'équipe SmartOrder AI
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Sans engagement · Essai gratuit 15 jours · Assistance 7j/7
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
