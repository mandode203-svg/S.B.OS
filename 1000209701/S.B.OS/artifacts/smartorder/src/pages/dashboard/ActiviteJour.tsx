import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function ActiviteJour() {
  return (
    <DashboardLayout>
      <MockPage
        title="Activité du Jour"
        description="Suivi en temps réel des événements du jour."
        stats={[
          { label: "Commandes aujourd'hui", value: "12", sub: "vs hier +3" },
          { label: "Revenus du jour", value: "85 400 FCFA", sub: "+12%" },
          { label: "Clients actifs", value: "8", sub: "En ligne maintenant" },
          { label: "Alertes", value: "2", sub: "Non résolues" },
        ]}
      />
    </DashboardLayout>
  );
}
