import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Modules() {
  return (
    <DashboardLayout>
      <MockPage
        title="Modules"
        description="Découvrez et installez de nouveaux modules."
        badge="Phase 2"
        stats={[
          { label: "Modules disponibles", value: "24", sub: "Catalogue" },
          { label: "Installés", value: "4", sub: "Actifs" },
          { label: "Gratuits", value: "12", sub: "Disponibles" },
          { label: "Premium", value: "12", sub: "Payants" },
        ]}
      />
    </DashboardLayout>
  );
}
