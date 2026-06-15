import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Instagram() {
  return (
    <DashboardLayout>
      <MockPage
        title="Instagram IA"
        description="Réponses automatiques Instagram DM & commentaires."
        badge="IA"
        stats={[
          { label: "DMs traités", value: "180", sub: "Ce mois" },
          { label: "Commentaires répondus", value: "420", sub: "Auto" },
          { label: "Commandes Instagram", value: "14", sub: "Ce mois" },
          { label: "Followers engagés", value: "2 400", sub: "Actifs" },
        ]}
      />
    </DashboardLayout>
  );
}
