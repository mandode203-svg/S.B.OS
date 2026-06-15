import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Reappro() {
  return (
    <DashboardLayout>
      <MockPage
        title="Réapprovisionnement IA"
        description="L'IA analyse vos ventes et anticipe les ruptures."
        badge="IA"
        stats={[
          { label: "Suggestions IA", value: "12", sub: "Cette semaine" },
          { label: "Ruptures évitées", value: "8", sub: "Ce mois" },
          { label: "Économies réalisées", value: "45 000 FCFA", sub: "Surplus évités" },
          { label: "Précision IA", value: "91%", sub: "Prédictions" },
        ]}
      />
    </DashboardLayout>
  );
}
