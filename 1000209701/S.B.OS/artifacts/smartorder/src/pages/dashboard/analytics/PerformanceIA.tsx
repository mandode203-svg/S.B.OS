import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function PerformanceIA() {
  return (
    <DashboardLayout>
      <MockPage
        title="Performance IA"
        description="Métriques de performance de l'IA SmartOrder."
        badge="IA"
        stats={[
          { label: "Précision globale", value: "91%", sub: "IA" },
          { label: "Commandes IA", value: "38%", sub: "Du total" },
          { label: "Temps économisé", value: "24h/mois", sub: "Équipe" },
          { label: "Satisfaction IA", value: "4.4/5", sub: "Clients" },
        ]}
      />
    </DashboardLayout>
  );
}
