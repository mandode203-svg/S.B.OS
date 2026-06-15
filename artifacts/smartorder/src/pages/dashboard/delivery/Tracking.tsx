import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Tracking() {
  return (
    <DashboardLayout>
      <MockPage
        title="Tracking"
        description="Suivi GPS en temps réel des livraisons."
        stats={[
          { label: "Livraisons trackées", value: "15", sub: "Actives" },
          { label: "Retards", value: "1", sub: "> 10 min" },
          { label: "Précision GPS", value: "98%", sub: "Temps réel" },
          { label: "Incidents", value: "0", sub: "Aujourd'hui" },
        ]}
      />
    </DashboardLayout>
  );
}
