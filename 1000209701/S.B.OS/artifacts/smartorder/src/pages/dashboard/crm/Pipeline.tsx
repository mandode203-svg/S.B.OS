import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Pipeline() {
  return (
    <DashboardLayout>
      <MockPage
        title="Pipeline Commercial"
        description="Suivi du cycle de vente prospect → client."
        stats={[
          { label: "Pipeline total", value: "1 240 000 FCFA", sub: "Valeur estimée" },
          { label: "En négociation", value: "18", sub: "Leads" },
          { label: "Deals gagnés", value: "12", sub: "Ce mois" },
          { label: "Deals perdus", value: "4", sub: "Ce mois" },
        ]}
      />
    </DashboardLayout>
  );
}
