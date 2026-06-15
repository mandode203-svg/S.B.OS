import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Achats() {
  return (
    <DashboardLayout>
      <MockPage
        title="Achats"
        description="Bons de commande et réceptions fournisseurs."
        stats={[
          { label: "Commandes ce mois", value: "18", sub: "Bons émis" },
          { label: "Valeur totale", value: "380 000 FCFA", sub: "Ce mois" },
          { label: "En attente réception", value: "5", sub: "À réceptionner" },
          { label: "Reçues ce mois", value: "13", sub: "Validées" },
        ]}
      />
    </DashboardLayout>
  );
}
