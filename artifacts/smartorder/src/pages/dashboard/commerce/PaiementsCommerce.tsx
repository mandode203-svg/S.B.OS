import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function PaiementsCommerce() {
  return (
    <DashboardLayout>
      <MockPage
        title="Paiements"
        description="Suivi des encaissements et transactions."
        stats={[
          { label: "Encaissés ce mois", value: "980 000 FCFA", sub: "Total" },
          { label: "Orange Money", value: "62%", sub: "Part" },
          { label: "En attente", value: "120 000 FCFA", sub: "À encaisser" },
          { label: "Remboursements", value: "2", sub: "Ce mois" },
        ]}
      />
    </DashboardLayout>
  );
}
