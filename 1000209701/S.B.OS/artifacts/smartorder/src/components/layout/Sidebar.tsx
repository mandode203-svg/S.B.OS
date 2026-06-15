import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useFailedLogsCount } from "@/hooks/useFailedLogsCount";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Zap, Brain, BarChart3,
  Package, Tag, Layers, Warehouse, Truck, ShoppingCart, RefreshCcw,
  ShoppingBag, CalendarRange, FileText, CreditCard, Monitor, Store,
  Bot, MessageCircle, Video, Globe, Megaphone, Calendar, TrendingUp,
  Bike, Route, MapPin, Navigation, Camera,
  Users, History, PieChart, Star, UserPlus,
  DollarSign, TrendingDown, Banknote, BarChart2, Landmark, FileBarChart, Sparkles,
  ShoppingBasket, LineChart, Cpu,
  Settings, Building2, Users2, Shield, Key, Receipt, Plug, Code2,
  AppWindow, Puzzle, Handshake, Link2,
  LogOut, ChefHat, Lock, Clock, ChevronDown, ChevronRight,
  Facebook, Instagram,
} from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";

interface NavChild {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  children: NavChild[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "text-blue-400",
    children: [
      { href: "/dashboard", label: "Vue Générale", icon: LayoutDashboard },
      { href: "/dashboard/activite", label: "Activité du Jour", icon: Zap },
      { href: "/dashboard/alertes-ia", label: "Alertes IA", icon: Brain },
      { href: "/dashboard/resume", label: "Résumé Business", icon: BarChart3 },
    ],
  },
  {
    id: "stockshop",
    label: "StockShop",
    icon: Package,
    color: "text-orange-400",
    children: [
      { href: "/dashboard/stockshop/produits", label: "Produits", icon: Package },
      { href: "/dashboard/stockshop/categories", label: "Catégories", icon: Tag },
      { href: "/dashboard/stockshop/variantes", label: "Variantes", icon: Layers },
      { href: "/dashboard/stockshop/inventaire", label: "Inventaire", icon: Warehouse },
      { href: "/dashboard/stockshop/entrepots", label: "Entrepôts", icon: Warehouse },
      { href: "/dashboard/stockshop/fournisseurs", label: "Fournisseurs", icon: Truck },
      { href: "/dashboard/stockshop/achats", label: "Achats", icon: ShoppingCart },
      { href: "/dashboard/stockshop/reappro", label: "Réappro IA", icon: RefreshCcw },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    icon: ShoppingBag,
    color: "text-green-400",
    children: [
      { href: "/dashboard/commerce/commandes", label: "Commandes", icon: ShoppingBag },
      { href: "/dashboard/commerce/reservations", label: "Réservations", icon: CalendarRange },
      { href: "/dashboard/commerce/factures", label: "Factures", icon: FileText },
      { href: "/dashboard/commerce/paiements", label: "Paiements", icon: CreditCard },
      { href: "/dashboard/commerce/pos", label: "POS", icon: Monitor },
      { href: "/dashboard/commerce/catalogue", label: "Catalogue", icon: Store },
    ],
  },
  {
    id: "ai",
    label: "SmartOrder AI",
    icon: Bot,
    color: "text-violet-400",
    children: [
      { href: "/dashboard/ai/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { href: "/dashboard/ai/tiktok", label: "TikTok Live", icon: Video },
      { href: "/dashboard/ai/facebook", label: "Facebook Messenger", icon: Facebook },
      { href: "/dashboard/ai/instagram", label: "Instagram", icon: Instagram },
      { href: "/dashboard/ai/chatweb", label: "Chat Web", icon: Globe },
      { href: "/dashboard/ai/reponses", label: "Réponses Auto", icon: Zap },
      { href: "/dashboard/ai/vente", label: "IA de Vente", icon: TrendingUp },
      { href: "/dashboard/ai/reservation", label: "IA Réservation", icon: Calendar },
      { href: "/dashboard/ai/campagnes", label: "Campagnes", icon: Megaphone },
      { href: "/dashboard/ai/assistant", label: "Assistant Business", icon: Brain },
    ],
  },
  {
    id: "delivery",
    label: "Delivery Hub",
    icon: Bike,
    color: "text-cyan-400",
    children: [
      { href: "/dashboard/delivery/livreurs", label: "Livreurs", icon: Bike },
      { href: "/dashboard/delivery/courses", label: "Courses", icon: Route },
      { href: "/dashboard/delivery/zones", label: "Zones de Livraison", icon: MapPin },
      { href: "/dashboard/delivery/tracking", label: "Tracking", icon: Navigation },
      { href: "/dashboard/delivery/preuves", label: "Preuves", icon: Camera },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    icon: Users,
    color: "text-pink-400",
    children: [
      { href: "/dashboard/crm/clients", label: "Clients", icon: Users },
      { href: "/dashboard/crm/historique", label: "Historique", icon: History },
      { href: "/dashboard/crm/segments", label: "Segments", icon: PieChart },
      { href: "/dashboard/crm/fidelite", label: "Fidélité", icon: Star },
      { href: "/dashboard/crm/leads", label: "Leads", icon: UserPlus },
      { href: "/dashboard/crm/pipeline", label: "Pipeline Commercial", icon: TrendingUp },
    ],
  },
  {
    id: "finance",
    label: "FinanceTPE",
    icon: DollarSign,
    color: "text-yellow-400",
    children: [
      { href: "/dashboard/finance/revenus", label: "Revenus", icon: TrendingUp },
      { href: "/dashboard/finance/depenses", label: "Dépenses", icon: TrendingDown },
      { href: "/dashboard/finance/tresorerie", label: "Trésorerie", icon: Banknote },
      { href: "/dashboard/finance/profit", label: "Profit", icon: BarChart2 },
      { href: "/dashboard/finance/comptes", label: "Comptes", icon: Landmark },
      { href: "/dashboard/finance/rapports", label: "Rapports", icon: FileBarChart },
      { href: "/dashboard/finance/previsions", label: "Prévisions IA", icon: Sparkles },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    color: "text-teal-400",
    children: [
      { href: "/dashboard/analytics/ventes", label: "Ventes", icon: TrendingUp },
      { href: "/dashboard/analytics/produits", label: "Produits", icon: ShoppingBasket },
      { href: "/dashboard/analytics/clients", label: "Clients", icon: Users },
      { href: "/dashboard/analytics/marketing", label: "Marketing", icon: Megaphone },
      { href: "/dashboard/analytics/livraisons", label: "Livraisons", icon: Truck },
      { href: "/dashboard/analytics/ia", label: "Performance IA", icon: Cpu },
    ],
  },
  {
    id: "settings",
    label: "Paramètres",
    icon: Settings,
    color: "text-gray-400",
    children: [
      { href: "/dashboard/parametres/entreprise", label: "Entreprise", icon: Building2 },
      { href: "/dashboard/parametres/utilisateurs", label: "Utilisateurs", icon: Users2 },
      { href: "/dashboard/parametres/roles", label: "Rôles", icon: Shield },
      { href: "/dashboard/parametres/permissions", label: "Permissions", icon: Key },
      { href: "/dashboard/parametres/abonnement", label: "Abonnement", icon: Receipt },
      { href: "/dashboard/parametres/integrations", label: "Intégrations", icon: Plug },
      { href: "/dashboard/parametres/api", label: "API", icon: Code2 },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: AppWindow,
    color: "text-amber-400",
    children: [
      { href: "/dashboard/marketplace/modules", label: "Modules", icon: AppWindow },
      { href: "/dashboard/marketplace/extensions", label: "Extensions", icon: Puzzle },
      { href: "/dashboard/marketplace/partenaires", label: "Partenaires", icon: Handshake },
      { href: "/dashboard/marketplace/connecteurs", label: "Connecteurs", icon: Link2 },
    ],
  },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { business, logout } = useAuth();
  const { locked, isInTrial, trialDaysLeft, planName } = usePlan();
  const failedCount = useFailedLogsCount();

  const activeGroupId = NAV_GROUPS.find(g =>
    g.children.some(c => c.href === location || (c.href !== "/dashboard" && location.startsWith(c.href)))
  )?.id ?? "dashboard";

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set([activeGroupId]));
  const [modalOpen, setModalOpen] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<string | undefined>();

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <>
      <aside className="flex flex-col h-full bg-card border-r border-border w-60">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate font-serif">
              {business?.name ?? "SmartOrder"}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {business?.type ?? "Business OS"}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {NAV_GROUPS.map(group => {
            const isOpen = openGroups.has(group.id);
            const GroupIcon = group.icon;
            const isGroupActive = group.children.some(
              c => c.href === location || (c.href !== "/dashboard" && location.startsWith(c.href))
            );

            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded w-full text-left transition-colors",
                    isGroupActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <GroupIcon className={cn("w-4 h-4 flex-shrink-0", isGroupActive ? group.color : "")} />
                  <span className="flex-1 text-xs font-semibold uppercase tracking-wide truncate">
                    {group.label}
                  </span>
                  {isOpen ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                </button>

                {isOpen && (
                  <div className="ml-2 mt-0.5 space-y-0.5 border-l border-border pl-2">
                    {group.children.map(({ href, label, icon: Icon, badge }) => {
                      const active = location === href || (href !== "/dashboard" && location.startsWith(href));
                      const showBadge = badge && failedCount > 0;
                      const isLocked = locked.has(href);

                      if (isLocked) {
                        return (
                          <button
                            key={href}
                            onClick={() => { setLockedFeature(label); setModalOpen(true); }}
                            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs w-full text-left text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
                            <span className="flex-1 truncate">{label}</span>
                            <Lock className="w-3 h-3 text-primary/50 flex-shrink-0" />
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors",
                            active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="flex-1 truncate">{label}</span>
                          {showBadge && (
                            <span className={cn(
                              "ml-auto inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold leading-none",
                              active ? "bg-white/20 text-white" : "bg-destructive text-destructive-foreground"
                            )}>
                              {failedCount > 99 ? "99+" : failedCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {isInTrial ? (
          <div className="mx-2 mb-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Clock className="w-3 h-3 text-primary" />
              <p className="text-[11px] font-semibold text-primary">Essai gratuit</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {trialDaysLeft > 0 ? `${trialDaysLeft} jour${trialDaysLeft > 1 ? "s" : ""} restant${trialDaysLeft > 1 ? "s" : ""}` : "Expire aujourd'hui"}
            </p>
          </div>
        ) : (
          planName !== "pro" && (
            <button
              onClick={() => { setLockedFeature(undefined); setModalOpen(true); }}
              className="mx-2 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-[11px] text-primary hover:bg-primary/10 transition-colors"
            >
              <Zap className="w-3 h-3" />
              <span className="font-medium">Passer au plan Pro</span>
            </button>
          )
        )}

        <div className="p-2 border-t border-border">
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Déconnexion
          </button>
        </div>
      </aside>

      <UpgradeModal open={modalOpen} onClose={() => setModalOpen(false)} featureName={lockedFeature} />
    </>
  );
}
