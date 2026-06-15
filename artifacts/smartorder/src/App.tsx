import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// ── Public pages ──
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminPanel from "@/pages/admin/AdminPanel";
import PaymentSimulator from "@/pages/PaymentSimulator";
import OrderPage from "@/pages/OrderPage";
import OrderTrackPage from "@/pages/OrderTrackPage";
import StorefrontPage from "@/pages/StorefrontPage";
import StorePortalPage from "@/pages/StorePortalPage";
import StoreChatPage from "@/pages/StoreChatPage";
import BookingPage from "@/pages/BookingPage";
import NotFound from "@/pages/not-found";

// ── Dashboard ──
import Dashboard from "@/pages/dashboard/Dashboard";
import ActiviteJour from "@/pages/dashboard/ActiviteJour";
import AlertesIA from "@/pages/dashboard/AlertesIA";
import ResumeBusiness from "@/pages/dashboard/ResumeBusiness";

// ── StockShop ──
import Produits from "@/pages/dashboard/stockshop/Produits";
import Categories from "@/pages/dashboard/stockshop/Categories";
import Variantes from "@/pages/dashboard/stockshop/Variantes";
import Inventaire from "@/pages/dashboard/stockshop/Inventaire";
import Entrepots from "@/pages/dashboard/stockshop/Entrepots";
import Fournisseurs from "@/pages/dashboard/stockshop/Fournisseurs";
import Achats from "@/pages/dashboard/stockshop/Achats";
import Reappro from "@/pages/dashboard/stockshop/Reappro";

// ── Commerce ──
import CommandesCommerce from "@/pages/dashboard/commerce/CommandesCommerce";
import ReservationsCommerce from "@/pages/dashboard/commerce/ReservationsCommerce";
import Factures from "@/pages/dashboard/commerce/Factures";
import PaiementsCommerce from "@/pages/dashboard/commerce/PaiementsCommerce";
import POS from "@/pages/dashboard/commerce/POS";
import CatalogueCommerce from "@/pages/dashboard/commerce/CatalogueCommerce";

// ── SmartOrder AI ──
import WhatsApp from "@/pages/dashboard/smartorder-ai/WhatsApp";
import TikTokLive from "@/pages/dashboard/smartorder-ai/TikTokLive";
import FacebookMessenger from "@/pages/dashboard/smartorder-ai/FacebookMessenger";
import Instagram from "@/pages/dashboard/smartorder-ai/Instagram";
import ChatWeb from "@/pages/dashboard/smartorder-ai/ChatWeb";
import ReponsesAuto from "@/pages/dashboard/smartorder-ai/ReponsesAuto";
import IAVente from "@/pages/dashboard/smartorder-ai/IAVente";
import IAReservation from "@/pages/dashboard/smartorder-ai/IAReservation";
import CampagnesMarketing from "@/pages/dashboard/smartorder-ai/CampagnesMarketing";
import AssistantBusiness from "@/pages/dashboard/smartorder-ai/AssistantBusiness";

// ── Delivery ──
import Livreurs from "@/pages/dashboard/delivery/Livreurs";
import Courses from "@/pages/dashboard/delivery/Courses";
import Zones from "@/pages/dashboard/delivery/Zones";
import Tracking from "@/pages/dashboard/delivery/Tracking";
import Preuves from "@/pages/dashboard/delivery/Preuves";

// ── CRM ──
import ClientsCRM from "@/pages/dashboard/crm/ClientsCRM";
import Historique from "@/pages/dashboard/crm/Historique";
import Segments from "@/pages/dashboard/crm/Segments";
import Fidelite from "@/pages/dashboard/crm/Fidelite";
import Leads from "@/pages/dashboard/crm/Leads";
import Pipeline from "@/pages/dashboard/crm/Pipeline";

// ── Finance ──
import Revenus from "@/pages/dashboard/finance/Revenus";
import Depenses from "@/pages/dashboard/finance/Depenses";
import Tresorerie from "@/pages/dashboard/finance/Tresorerie";
import Profit from "@/pages/dashboard/finance/Profit";
import Comptes from "@/pages/dashboard/finance/Comptes";
import RapportsFinance from "@/pages/dashboard/finance/RapportsFinance";
import PrevisionIA from "@/pages/dashboard/finance/PrevisionIA";

// ── Analytics ──
import AnalyticsVentes from "@/pages/dashboard/analytics/AnalyticsVentes";
import AnalyticsProduits from "@/pages/dashboard/analytics/AnalyticsProduits";
import AnalyticsClients from "@/pages/dashboard/analytics/AnalyticsClients";
import AnalyticsMarketing from "@/pages/dashboard/analytics/AnalyticsMarketing";
import AnalyticsLivraisons from "@/pages/dashboard/analytics/AnalyticsLivraisons";
import PerformanceIA from "@/pages/dashboard/analytics/PerformanceIA";

// ── Paramètres ──
import Entreprise from "@/pages/dashboard/parametres/Entreprise";
import Utilisateurs from "@/pages/dashboard/parametres/Utilisateurs";
import Roles from "@/pages/dashboard/parametres/Roles";
import Permissions from "@/pages/dashboard/parametres/Permissions";
import Abonnement from "@/pages/dashboard/parametres/Abonnement";
import Integrations from "@/pages/dashboard/parametres/Integrations";
import API from "@/pages/dashboard/parametres/API";

// ── Marketplace ──
import Modules from "@/pages/dashboard/marketplace/Modules";
import Extensions from "@/pages/dashboard/marketplace/Extensions";
import Partenaires from "@/pages/dashboard/marketplace/Partenaires";
import Connecteurs from "@/pages/dashboard/marketplace/Connecteurs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!token) return <Redirect to="/login" />;
  return <Component />;
}

function PublicOnlyRoute({ component: Component }: { component: React.ComponentType }) {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (token) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* ── Public ── */}
      <Route path="/"         component={() => <PublicOnlyRoute component={Landing} />} />
      <Route path="/login"    component={() => <PublicOnlyRoute component={Login} />} />
      <Route path="/register" component={() => <PublicOnlyRoute component={Register} />} />

      {/* ── Dashboard ── */}
      <Route path="/dashboard"            component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/dashboard/activite"   component={() => <ProtectedRoute component={ActiviteJour} />} />
      <Route path="/dashboard/alertes-ia" component={() => <ProtectedRoute component={AlertesIA} />} />
      <Route path="/dashboard/resume"     component={() => <ProtectedRoute component={ResumeBusiness} />} />

      {/* ── StockShop ── */}
      <Route path="/dashboard/stockshop/produits"    component={() => <ProtectedRoute component={Produits} />} />
      <Route path="/dashboard/stockshop/categories"  component={() => <ProtectedRoute component={Categories} />} />
      <Route path="/dashboard/stockshop/variantes"   component={() => <ProtectedRoute component={Variantes} />} />
      <Route path="/dashboard/stockshop/inventaire"  component={() => <ProtectedRoute component={Inventaire} />} />
      <Route path="/dashboard/stockshop/entrepots"   component={() => <ProtectedRoute component={Entrepots} />} />
      <Route path="/dashboard/stockshop/fournisseurs" component={() => <ProtectedRoute component={Fournisseurs} />} />
      <Route path="/dashboard/stockshop/achats"      component={() => <ProtectedRoute component={Achats} />} />
      <Route path="/dashboard/stockshop/reappro"     component={() => <ProtectedRoute component={Reappro} />} />

      {/* ── Commerce ── */}
      <Route path="/dashboard/commerce/commandes"    component={() => <ProtectedRoute component={CommandesCommerce} />} />
      <Route path="/dashboard/commerce/reservations" component={() => <ProtectedRoute component={ReservationsCommerce} />} />
      <Route path="/dashboard/commerce/factures"     component={() => <ProtectedRoute component={Factures} />} />
      <Route path="/dashboard/commerce/paiements"    component={() => <ProtectedRoute component={PaiementsCommerce} />} />
      <Route path="/dashboard/commerce/pos"          component={() => <ProtectedRoute component={POS} />} />
      <Route path="/dashboard/commerce/catalogue"    component={() => <ProtectedRoute component={CatalogueCommerce} />} />

      {/* ── SmartOrder AI ── */}
      <Route path="/dashboard/ai/whatsapp"   component={() => <ProtectedRoute component={WhatsApp} />} />
      <Route path="/dashboard/ai/tiktok"     component={() => <ProtectedRoute component={TikTokLive} />} />
      <Route path="/dashboard/ai/facebook"   component={() => <ProtectedRoute component={FacebookMessenger} />} />
      <Route path="/dashboard/ai/instagram"  component={() => <ProtectedRoute component={Instagram} />} />
      <Route path="/dashboard/ai/chatweb"    component={() => <ProtectedRoute component={ChatWeb} />} />
      <Route path="/dashboard/ai/reponses"   component={() => <ProtectedRoute component={ReponsesAuto} />} />
      <Route path="/dashboard/ai/vente"      component={() => <ProtectedRoute component={IAVente} />} />
      <Route path="/dashboard/ai/reservation" component={() => <ProtectedRoute component={IAReservation} />} />
      <Route path="/dashboard/ai/campagnes"  component={() => <ProtectedRoute component={CampagnesMarketing} />} />
      <Route path="/dashboard/ai/assistant"  component={() => <ProtectedRoute component={AssistantBusiness} />} />

      {/* ── Delivery ── */}
      <Route path="/dashboard/delivery/livreurs" component={() => <ProtectedRoute component={Livreurs} />} />
      <Route path="/dashboard/delivery/courses"  component={() => <ProtectedRoute component={Courses} />} />
      <Route path="/dashboard/delivery/zones"    component={() => <ProtectedRoute component={Zones} />} />
      <Route path="/dashboard/delivery/tracking" component={() => <ProtectedRoute component={Tracking} />} />
      <Route path="/dashboard/delivery/preuves"  component={() => <ProtectedRoute component={Preuves} />} />

      {/* ── CRM ── */}
      <Route path="/dashboard/crm/clients"    component={() => <ProtectedRoute component={ClientsCRM} />} />
      <Route path="/dashboard/crm/historique" component={() => <ProtectedRoute component={Historique} />} />
      <Route path="/dashboard/crm/segments"   component={() => <ProtectedRoute component={Segments} />} />
      <Route path="/dashboard/crm/fidelite"   component={() => <ProtectedRoute component={Fidelite} />} />
      <Route path="/dashboard/crm/leads"      component={() => <ProtectedRoute component={Leads} />} />
      <Route path="/dashboard/crm/pipeline"   component={() => <ProtectedRoute component={Pipeline} />} />

      {/* ── Finance ── */}
      <Route path="/dashboard/finance/revenus"    component={() => <ProtectedRoute component={Revenus} />} />
      <Route path="/dashboard/finance/depenses"   component={() => <ProtectedRoute component={Depenses} />} />
      <Route path="/dashboard/finance/tresorerie" component={() => <ProtectedRoute component={Tresorerie} />} />
      <Route path="/dashboard/finance/profit"     component={() => <ProtectedRoute component={Profit} />} />
      <Route path="/dashboard/finance/comptes"    component={() => <ProtectedRoute component={Comptes} />} />
      <Route path="/dashboard/finance/rapports"   component={() => <ProtectedRoute component={RapportsFinance} />} />
      <Route path="/dashboard/finance/previsions" component={() => <ProtectedRoute component={PrevisionIA} />} />

      {/* ── Analytics ── */}
      <Route path="/dashboard/analytics/ventes"     component={() => <ProtectedRoute component={AnalyticsVentes} />} />
      <Route path="/dashboard/analytics/produits"   component={() => <ProtectedRoute component={AnalyticsProduits} />} />
      <Route path="/dashboard/analytics/clients"    component={() => <ProtectedRoute component={AnalyticsClients} />} />
      <Route path="/dashboard/analytics/marketing"  component={() => <ProtectedRoute component={AnalyticsMarketing} />} />
      <Route path="/dashboard/analytics/livraisons" component={() => <ProtectedRoute component={AnalyticsLivraisons} />} />
      <Route path="/dashboard/analytics/ia"         component={() => <ProtectedRoute component={PerformanceIA} />} />

      {/* ── Paramètres ── */}
      <Route path="/dashboard/parametres/entreprise"   component={() => <ProtectedRoute component={Entreprise} />} />
      <Route path="/dashboard/parametres/utilisateurs" component={() => <ProtectedRoute component={Utilisateurs} />} />
      <Route path="/dashboard/parametres/roles"        component={() => <ProtectedRoute component={Roles} />} />
      <Route path="/dashboard/parametres/permissions"  component={() => <ProtectedRoute component={Permissions} />} />
      <Route path="/dashboard/parametres/abonnement"   component={() => <ProtectedRoute component={Abonnement} />} />
      <Route path="/dashboard/parametres/integrations" component={() => <ProtectedRoute component={Integrations} />} />
      <Route path="/dashboard/parametres/api"          component={() => <ProtectedRoute component={API} />} />

      {/* ── Marketplace ── */}
      <Route path="/dashboard/marketplace/modules"     component={() => <ProtectedRoute component={Modules} />} />
      <Route path="/dashboard/marketplace/extensions"  component={() => <ProtectedRoute component={Extensions} />} />
      <Route path="/dashboard/marketplace/partenaires" component={() => <ProtectedRoute component={Partenaires} />} />
      <Route path="/dashboard/marketplace/connecteurs" component={() => <ProtectedRoute component={Connecteurs} />} />

      {/* ── Pages publiques ── */}
      <Route path="/admin"        component={() => <ProtectedRoute component={AdminPanel} />} />
      <Route path="/payment-sim"  component={PaymentSimulator} />
      <Route path="/order/:slug/track/:orderId" component={OrderTrackPage} />
      <Route path="/order/:slug"  component={OrderPage} />
      <Route path="/store/:storeId/track/:orderId" component={OrderTrackPage} />
      <Route path="/store/:storeId/catalog" component={StorefrontPage} />
      <Route path="/store/:storeId/chat"    component={StoreChatPage} />
      <Route path="/store/:storeId"         component={StorePortalPage} />
      <Route path="/book/:storeId"          component={BookingPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
