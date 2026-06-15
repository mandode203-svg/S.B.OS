import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Roles() {
  return (
    <DashboardLayout>
      <MockPage
        title="Rôles"
        description="Créez et gérez les rôles d'accès."
        stats={[
          { label: "Rôles définis", value: "4", sub: "Manager, Caissier..." },
          { label: "Rôles personnalisés", value: "1", sub: "Créé" },
          { label: "Utilisateurs par rôle", value: "Manager: 2", sub: "—" },
          { label: "Rôle par défaut", value: "Employé", sub: "—" },
        ]}
      />
    </DashboardLayout>
  );
}
