import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Preuves() {
  return (
    <DashboardLayout>
      <MockPage
        title="Preuves de Livraison"
        description="Photos et signatures de confirmation."
        stats={[
          { label: "Preuves collectées", value: "1 240", sub: "Ce mois" },
          { label: "Taux collecte", value: "96%", sub: "Avec preuve" },
          { label: "Litiges", value: "3", sub: "Ce mois" },
          { label: "Litiges résolus", value: "2", sub: "Grâce aux preuves" },
        ]}
      />
    </DashboardLayout>
  );
}
