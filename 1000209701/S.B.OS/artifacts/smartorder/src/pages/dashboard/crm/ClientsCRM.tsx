import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function ClientsCRM() {
  return (
    <DashboardLayout>
      <MockPage
        title="Clients"
        description="Base de données clients complète."
        stats={[
          { label: "Total clients", value: "1 840", sub: "Inscrits" },
          { label: "Nouveaux ce mois", value: "124", sub: "Acquisitions" },
          { label: "Actifs 30j", value: "680", sub: "Récents" },
          { label: "VIP", value: "42", sub: "Top clients" },
        ]}
      />
    </DashboardLayout>
  );
}
