import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Utilisateurs() {
  return (
    <DashboardLayout>
      <MockPage
        title="Utilisateurs"
        description="Gérez les accès membres de votre équipe."
        stats={[
          { label: "Utilisateurs", value: "6", sub: "Actifs" },
          { label: "Admins", value: "2", sub: "Rôle admin" },
          { label: "Invitations en attente", value: "1", sub: "En attente" },
          { label: "Dernière connexion", value: "Aujourd'hui", sub: "—" },
        ]}
      />
    </DashboardLayout>
  );
}
