import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Connecteurs() {
  return (
    <DashboardLayout>
      <MockPage
        title="Connecteurs"
        description="Connectez SmartOrder à vos outils métier."
        badge="Phase 2"
        stats={[
          { label: "Connecteurs", value: "32", sub: "Disponibles" },
          { label: "Actifs", value: "3", sub: "Configurés" },
          { label: "E-commerce", value: "8", sub: "Shopify, WooCommerce..." },
          { label: "Comptabilité", value: "4", sub: "Sage, QuickBooks..." },
        ]}
      />
    </DashboardLayout>
  );
}
