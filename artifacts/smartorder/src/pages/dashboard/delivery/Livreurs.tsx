import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Livreurs() {
  return (
    <DashboardLayout>
      <MockPage
        title="Livreurs"
        description="Gestion de votre flotte de livreurs."
        stats={[
          { label: "Livreurs actifs", value: "8", sub: "En service" },
          { label: "En course", value: "3", sub: "Actuellement" },
          { label: "Disponibles", value: "5", sub: "Prêts" },
          { label: "Note moyenne", value: "4.7/5", sub: "Satisfaction" },
        ]}
      />
    </DashboardLayout>
  );
}
