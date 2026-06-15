import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Partenaires() {
  return (
    <DashboardLayout>
      <MockPage
        title="Partenaires"
        description="Écosystème de partenaires certifiés."
        badge="Phase 2"
        stats={[
          { label: "Partenaires", value: "42", sub: "Certifiés" },
          { label: "Cameroun", value: "28", sub: "Locaux" },
          { label: "Intégrateurs", value: "8", sub: "Disponibles" },
          { label: "Partenaire gold", value: "4", sub: "Premium" },
        ]}
      />
    </DashboardLayout>
  );
}
