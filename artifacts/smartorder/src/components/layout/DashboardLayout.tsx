import { type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import { Menu, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":                          "Vue Générale",
  "/dashboard/activite":                 "Activité du Jour",
  "/dashboard/alertes-ia":               "Alertes IA",
  "/dashboard/resume":                   "Résumé Business",
  "/dashboard/stockshop/produits":       "Produits",
  "/dashboard/stockshop/categories":     "Catégories",
  "/dashboard/stockshop/variantes":      "Variantes",
  "/dashboard/stockshop/inventaire":     "Inventaire",
  "/dashboard/stockshop/entrepots":      "Entrepôts",
  "/dashboard/stockshop/fournisseurs":   "Fournisseurs",
  "/dashboard/stockshop/achats":         "Achats",
  "/dashboard/stockshop/reappro":        "Réapprovisionnement IA",
  "/dashboard/commerce/commandes":       "Commandes",
  "/dashboard/commerce/reservations":    "Réservations",
  "/dashboard/commerce/factures":        "Factures",
  "/dashboard/commerce/paiements":       "Paiements",
  "/dashboard/commerce/pos":             "Point de Vente (POS)",
  "/dashboard/commerce/catalogue":       "Catalogue",
  "/dashboard/ai/whatsapp":              "WhatsApp",
  "/dashboard/ai/tiktok":               "TikTok Live",
  "/dashboard/ai/facebook":             "Facebook Messenger",
  "/dashboard/ai/instagram":            "Instagram",
  "/dashboard/ai/chatweb":              "Chat Web",
  "/dashboard/ai/reponses":             "Réponses Automatiques",
  "/dashboard/ai/vente":                "IA de Vente",
  "/dashboard/ai/reservation":          "IA Réservation",
  "/dashboard/ai/campagnes":            "Campagnes Marketing",
  "/dashboard/ai/assistant":            "Assistant Business IA",
  "/dashboard/delivery/livreurs":        "Livreurs",
  "/dashboard/delivery/courses":         "Courses",
  "/dashboard/delivery/zones":           "Zones de Livraison",
  "/dashboard/delivery/tracking":        "Tracking",
  "/dashboard/delivery/preuves":         "Preuves de Livraison",
  "/dashboard/crm/clients":             "Clients",
  "/dashboard/crm/historique":          "Historique",
  "/dashboard/crm/segments":            "Segments",
  "/dashboard/crm/fidelite":            "Fidélité",
  "/dashboard/crm/leads":               "Leads",
  "/dashboard/crm/pipeline":            "Pipeline Commercial",
  "/dashboard/finance/revenus":          "Revenus",
  "/dashboard/finance/depenses":         "Dépenses",
  "/dashboard/finance/tresorerie":       "Trésorerie",
  "/dashboard/finance/profit":           "Profit",
  "/dashboard/finance/comptes":          "Comptes",
  "/dashboard/finance/rapports":         "Rapports Financiers",
  "/dashboard/finance/previsions":       "Prévisions IA",
  "/dashboard/analytics/ventes":        "Analytics — Ventes",
  "/dashboard/analytics/produits":      "Analytics — Produits",
  "/dashboard/analytics/clients":       "Analytics — Clients",
  "/dashboard/analytics/marketing":     "Analytics — Marketing",
  "/dashboard/analytics/livraisons":    "Analytics — Livraisons",
  "/dashboard/analytics/ia":            "Performance IA",
  "/dashboard/parametres/entreprise":   "Entreprise",
  "/dashboard/parametres/utilisateurs": "Utilisateurs",
  "/dashboard/parametres/roles":        "Rôles",
  "/dashboard/parametres/permissions":  "Permissions",
  "/dashboard/parametres/abonnement":   "Abonnement",
  "/dashboard/parametres/integrations": "Intégrations",
  "/dashboard/parametres/api":          "API",
  "/dashboard/marketplace/modules":      "Modules",
  "/dashboard/marketplace/extensions":   "Extensions",
  "/dashboard/marketplace/partenaires":  "Partenaires",
  "/dashboard/marketplace/connecteurs":  "Connecteurs",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { business } = useAuth();
  const [location] = useLocation();
  const title = ROUTE_TITLES[location] ?? "SmartOrder Business OS";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center gap-4 px-4 md:px-6 h-14 border-b border-border bg-background flex-shrink-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-60">
              <Sidebar />
            </SheetContent>
          </Sheet>

          <h1 className="text-base font-semibold font-serif flex-1">{title}</h1>

          {business?.slug && (
            <a
              href={`/order/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Page commande
            </a>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
