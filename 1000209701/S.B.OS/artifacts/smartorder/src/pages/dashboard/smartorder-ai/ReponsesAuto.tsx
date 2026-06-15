import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function ReponsesAuto() {
  return (
    <DashboardLayout>
      <MockPage
        title="Réponses Automatiques"
        description="Configurez les réponses automatiques de l'IA."
        badge="IA"
        stats={[
          { label: "Modèles actifs", value: "24", sub: "Configurés" },
          { label: "Déclenchements", value: "1 840", sub: "Ce mois" },
          { label: "Taux succès", value: "93%", sub: "Sans escalade" },
          { label: "Langues", value: "3", sub: "FR, EN, Pidgin" },
        ]}
      />
    </DashboardLayout>
  );
}
