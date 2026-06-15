import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function AnalyticsMarketing() {
  return (
    <DashboardLayout>
      <MockPage
        title="Analytics — Marketing"
        description="Performance de vos actions marketing."
        stats={[
          { label: "Impressions", value: "24 000", sub: "Ce mois" },
          { label: "Clics", value: "3 200", sub: "Taux 13%" },
          { label: "Conversions", value: "280", sub: "Ce mois" },
          { label: "Coût/acquisition", value: "2 100 FCFA", sub: "Moyen" },
        ]}
      />
    </DashboardLayout>
  );
}
