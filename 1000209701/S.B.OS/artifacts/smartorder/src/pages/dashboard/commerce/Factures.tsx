import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Factures() {
  return (
    <DashboardLayout>
      <MockPage
        title="Factures"
        description="Émission et suivi des factures."
        stats={[
          { label: "Factures ce mois", value: "67", sub: "Émises" },
          { label: "Montant total", value: "1 240 000 FCFA", sub: "Ce mois" },
          { label: "En attente paiement", value: "12", sub: "À recouvrer" },
          { label: "Payées", value: "55", sub: "Ce mois" },
        ]}
      />
    </DashboardLayout>
  );
}
