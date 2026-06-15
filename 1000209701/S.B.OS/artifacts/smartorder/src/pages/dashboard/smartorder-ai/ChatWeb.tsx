import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function ChatWeb() {
  return (
    <DashboardLayout>
      <MockPage
        title="Chat Web"
        description="Widget de chat IA sur votre site."
        badge="IA"
        stats={[
          { label: "Sessions chat", value: "560", sub: "Ce mois" },
          { label: "Commandes via chat", value: "34", sub: "Ce mois" },
          { label: "Satisfaction", value: "4.6/5", sub: "Note clients" },
          { label: "Temps résolution", value: "1m 20s", sub: "Moyen" },
        ]}
      />
    </DashboardLayout>
  );
}
