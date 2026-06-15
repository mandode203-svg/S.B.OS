import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function TikTokLive() {
  return (
    <DashboardLayout>
      <MockPage
        title="TikTok Live"
        description="Capture de commandes pendant les lives TikTok."
        badge="IA"
        stats={[
          { label: "Lives connectés", value: "3", sub: "Ce mois" },
          { label: "Commandes capturées", value: "124", sub: "Via live" },
          { label: "CA généré", value: "380 000 FCFA", sub: "Via TikTok" },
          { label: "Viewers moyen", value: "1 240", sub: "Par live" },
        ]}
      />
    </DashboardLayout>
  );
}
