import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Leads() {
  return (
    <DashboardLayout>
      <MockPage
        title="Leads"
        description="Gestion des prospects entrants."
        stats={[
          { label: "Leads actifs", value: "86", sub: "En cours" },
          { label: "Nouveaux ce mois", value: "34", sub: "Entrants" },
          { label: "Convertis", value: "12", sub: "En clients" },
          { label: "Taux conversion", value: "35%", sub: "Ce mois" },
        ]}
      />
    </DashboardLayout>
  );
}
