import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function CampagnesMarketing() {
  return (
    <DashboardLayout>
      <MockPage
        title="Campagnes Marketing"
        description="Campagnes automatisées multi-canaux."
        badge="IA"
        stats={[
          { label: "Campagnes actives", value: "3", sub: "En cours" },
          { label: "Contacts touchés", value: "4 200", sub: "Ce mois" },
          { label: "Taux ouverture", value: "34%", sub: "Messages" },
          { label: "ROI campagnes", value: "x4.2", sub: "Ce mois" },
        ]}
      />
    </DashboardLayout>
  );
}
