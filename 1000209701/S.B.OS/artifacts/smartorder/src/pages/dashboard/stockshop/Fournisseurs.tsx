import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Fournisseurs() {
  return (
    <DashboardLayout>
      <MockPage
        title="Fournisseurs"
        description="Gérez vos relations fournisseurs."
        stats={[
          { label: "Fournisseurs", value: "24", sub: "Actifs" },
          { label: "Commandes en cours", value: "5", sub: "Attendues" },
          { label: "Délai moyen", value: "3.2 jours", sub: "Livraison" },
          { label: "Meilleur fournisseur", value: "DistribCM", sub: "Score 96" },
        ]}
      />
    </DashboardLayout>
  );
}
