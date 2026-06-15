import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function IAVente() {
  return (
    <DashboardLayout>
      <MockPage
        title="IA de Vente"
        description="L'IA engage et convertit vos prospects."
        badge="IA"
        stats={[
          { label: "Prospects contactés", value: "280", sub: "Ce mois" },
          { label: "Conversions", value: "42", sub: "Ce mois" },
          { label: "Taux conversion IA", value: "15%", sub: "vs 8% manuel" },
          { label: "CA généré IA", value: "340 000 FCFA", sub: "Ce mois" },
        ]}
      />
    </DashboardLayout>
  );
}
