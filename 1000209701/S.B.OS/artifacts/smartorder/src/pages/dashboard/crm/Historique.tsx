import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Historique() {
  return (
    <DashboardLayout>
      <MockPage
        title="Historique"
        description="Historique complet des interactions clients."
        stats={[
          { label: "Interactions ce mois", value: "3 240", sub: "Total" },
          { label: "Commandes", value: "1 240", sub: "Ce mois" },
          { label: "Messages", value: "1 800", sub: "Échangés" },
          { label: "Réclamations", value: "12", sub: "Résolues: 10" },
        ]}
      />
    </DashboardLayout>
  );
}
