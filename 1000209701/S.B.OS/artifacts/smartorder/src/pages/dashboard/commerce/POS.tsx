import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function POS() {
  return (
    <DashboardLayout>
      <MockPage
        title="Point de Vente (POS)"
        description="Interface caisse pour ventes en physique."
        stats={[
          { label: "Ventes POS aujourd'hui", value: "24", sub: "Transactions" },
          { label: "CA POS", value: "48 000 FCFA", sub: "Aujourd'hui" },
          { label: "Panier moyen", value: "2 000 FCFA", sub: "POS" },
          { label: "Ticket le + haut", value: "8 500 FCFA", sub: "Aujourd'hui" },
        ]}
      />
    </DashboardLayout>
  );
}
