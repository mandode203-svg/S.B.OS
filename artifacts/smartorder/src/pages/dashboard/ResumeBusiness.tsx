import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function ResumeBusiness() {
  return (
    <DashboardLayout>
      <MockPage
        title="Résumé Business"
        description="Vue synthétique de la santé de votre entreprise."
        stats={[
          { label: "Score santé", value: "87/100", sub: "Excellent" },
          { label: "Croissance", value: "+18%", sub: "Ce mois" },
          { label: "Rétention clients", value: "72%", sub: "vs 68% mois passé" },
          { label: "MRR", value: "420 000 FCFA", sub: "Revenu mensuel récurrent" },
        ]}
      />
    </DashboardLayout>
  );
}
