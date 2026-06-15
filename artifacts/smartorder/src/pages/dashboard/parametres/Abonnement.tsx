import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Abonnement() {
  return (
    <DashboardLayout>
      <MockPage
        title="Abonnement"
        description="Votre plan actuel et options de mise à niveau."
        stats={[
          { label: "Plan actuel", value: "Pro", sub: "Actif" },
          { label: "Prochaine facture", value: "15 000 FCFA", sub: "Le 01/07" },
          { label: "Fonctionnalités", value: "Toutes", sub: "Débloquées" },
          { label: "Renouvellement", value: "Auto", sub: "Activé" },
        ]}
      />
    </DashboardLayout>
  );
}
