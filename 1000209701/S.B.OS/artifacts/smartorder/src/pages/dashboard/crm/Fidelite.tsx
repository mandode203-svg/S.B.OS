import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Fidelite() {
  return (
    <DashboardLayout>
      <MockPage
        title="Fidélité"
        description="Programme de fidélité et récompenses."
        stats={[
          { label: "Membres fidélité", value: "620", sub: "Inscrits" },
          { label: "Points distribués", value: "124 000", sub: "Ce mois" },
          { label: "Récompenses échangées", value: "42", sub: "Ce mois" },
          { label: "Taux fidélisation", value: "72%", sub: "Récurrence" },
        ]}
      />
    </DashboardLayout>
  );
}
