import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Entreprise() {
  return (
    <DashboardLayout>
      <MockPage
        title="Entreprise"
        description="Informations et configuration de votre entreprise."
        stats={[
          { label: "Nom", value: "Mon Business", sub: "Raison sociale" },
          { label: "Plan actif", value: "Pro", sub: "Renouvellement dans 18j" },
          { label: "Utilisateurs", value: "5", sub: "Actifs" },
          { label: "Intégrations", value: "3", sub: "Connectées" },
        ]}
      />
    </DashboardLayout>
  );
}

