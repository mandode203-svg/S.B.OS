import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function AnalyticsVentes() {
  return (
    <DashboardLayout>
      <MockPage
        title="Analytics — Ventes"
        description="Analyse approfondie des performances de ventes."
        stats={[
          { label: "Ventes ce mois", value: "1 240", sub: "Commandes" },
          { label: "Panier moyen", value: "1 484 FCFA", sub: "Par commande" },
          { label: "Heure de pointe", value: "12h-14h", sub: "Pic quotidien" },
          { label: "Jour top", value: "Samedi", sub: "+ de ventes" },
        ]}
      />
    </DashboardLayout>
  );
}
