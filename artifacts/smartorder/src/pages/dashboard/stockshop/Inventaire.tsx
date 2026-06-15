import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Inventaire() {
  return (
    <DashboardLayout>
      <MockPage
        title="Inventaire"
        description="Suivi des niveaux de stock en temps réel."
        stats={[
          { label: "Produits en stock", value: "128", sub: "Sur 142 actifs" },
          { label: "Valeur totale", value: "2 450 000 FCFA", sub: "FCFA" },
          { label: "Entrées ce mois", value: "1 240 unités", sub: "Réceptions" },
          { label: "Sorties ce mois", value: "980 unités", sub: "Ventes + pertes" },
        ]}
      />
    </DashboardLayout>
  );
}
