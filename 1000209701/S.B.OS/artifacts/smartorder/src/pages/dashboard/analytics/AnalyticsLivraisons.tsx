import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function AnalyticsLivraisons() {
  return (
    <DashboardLayout>
      <MockPage
        title="Analytics — Livraisons"
        description="KPIs de performance livraison."
        stats={[
          { label: "Taux livraison", value: "96%", sub: "À temps" },
          { label: "Délai moyen", value: "28 min", sub: "Livraison" },
          { label: "Satisfaction livraison", value: "4.7/5", sub: "Note" },
          { label: "Retours", value: "1.2%", sub: "Taux" },
        ]}
      />
    </DashboardLayout>
  );
}
