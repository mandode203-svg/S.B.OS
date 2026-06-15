import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Integrations() {
  return (
    <DashboardLayout>
      <MockPage
        title="Intégrations"
        description="Connectez des services tiers à SmartOrder."
        stats={[
          { label: "Intégrations actives", value: "4", sub: "Connectées" },
          { label: "Disponibles", value: "24", sub: "Catalogue" },
          { label: "Webhooks actifs", value: "3", sub: "Configurés" },
          { label: "API calls ce mois", value: "4 240", sub: "Utilisés" },
        ]}
      />
    </DashboardLayout>
  );
}
