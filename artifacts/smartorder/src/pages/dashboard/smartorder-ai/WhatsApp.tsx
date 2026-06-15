import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function WhatsApp() {
  return (
    <DashboardLayout>
      <MockPage
        title="WhatsApp IA"
        description="Gestion des conversations WhatsApp automatisées."
        badge="IA"
        stats={[
          { label: "Conversations actives", value: "18", sub: "En cours" },
          { label: "Messages traités", value: "1 240", sub: "Ce mois" },
          { label: "Taux réponse IA", value: "87%", sub: "Auto-traités" },
          { label: "Commandes via WA", value: "45", sub: "Ce mois" },
        ]}
      />
    </DashboardLayout>
  );
}
