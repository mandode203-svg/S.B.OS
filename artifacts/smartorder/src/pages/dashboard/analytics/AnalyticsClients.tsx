import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function AnalyticsClients() {
  return (
    <DashboardLayout>
      <MockPage
        title="Analytics — Clients"
        description="Comportement et segmentation clients."
        stats={[
          { label: "LTV moyen", value: "84 000 FCFA", sub: "Par client" },
          { label: "Taux réachat", value: "64%", sub: "30 jours" },
          { label: "NPS", value: "68", sub: "Satisfaction" },
          { label: "Clients perdus", value: "8", sub: "Ce mois" },
        ]}
      />
    </DashboardLayout>
  );
}
