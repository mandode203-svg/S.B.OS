import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Permissions() {
  return (
    <DashboardLayout>
      <MockPage
        title="Permissions"
        description="Configurez les droits par rôle."
        stats={[
          { label: "Permissions configurées", value: "48", sub: "Total" },
          { label: "Modules protégés", value: "8", sub: "Accès contrôlé" },
          { label: "Modifications récentes", value: "2", sub: "Cette semaine" },
          { label: "Audit log", value: "Activé", sub: "Sécurité" },
        ]}
      />
    </DashboardLayout>
  );
}
