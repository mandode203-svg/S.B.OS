import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Extensions() {
  return (
    <DashboardLayout>
      <MockPage
        title="Extensions"
        description="Extensions pour enrichir SmartOrder."
        badge="Phase 2"
        stats={[
          { label: "Extensions", value: "18", sub: "Catalogue" },
          { label: "Installées", value: "2", sub: "Actives" },
          { label: "Populaires", value: "5", sub: "Top notées" },
          { label: "Nouvelles", value: "3", sub: "Ce mois" },
        ]}
      />
    </DashboardLayout>
  );
}
