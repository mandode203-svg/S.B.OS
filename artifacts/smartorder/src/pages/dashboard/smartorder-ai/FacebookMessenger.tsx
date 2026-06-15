import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function FacebookMessenger() {
  return (
    <DashboardLayout>
      <MockPage
        title="Facebook Messenger"
        description="Bot IA pour Facebook Messenger."
        badge="IA"
        stats={[
          { label: "Conversations", value: "340", sub: "Ce mois" },
          { label: "Commandes Messenger", value: "28", sub: "Ce mois" },
          { label: "Taux conversion", value: "8.2%", sub: "Messenger" },
          { label: "Temps réponse", value: "< 2 sec", sub: "Moyen IA" },
        ]}
      />
    </DashboardLayout>
  );
}
