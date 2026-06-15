import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function AlertesIA() {
  return (
    <DashboardLayout>
      <MockPage
        title="Alertes IA"
        description="Notifications intelligentes générées par l'IA."
        badge="IA"
        stats={[
          { label: "Alertes actives", value: "5", sub: "Critiques: 1" },
          { label: "Résolues aujourd'hui", value: "3", sub: "Auto-résolution" },
          { label: "Stock critique", value: "2 produits", sub: "Action requise" },
          { label: "IA précision", value: "94%", sub: "Sur 30 jours" },
        ]}
      />
    </DashboardLayout>
  );
}
