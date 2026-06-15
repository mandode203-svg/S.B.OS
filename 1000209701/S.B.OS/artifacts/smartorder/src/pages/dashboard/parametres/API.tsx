import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function API() {
  return (
    <DashboardLayout>
      <MockPage
        title="API"
        description="Clés API et documentation développeur."
        stats={[
          { label: "Clés API actives", value: "2", sub: "Générées" },
          { label: "Appels ce mois", value: "4 240", sub: "Requêtes" },
          { label: "Erreurs", value: "0.2%", sub: "Taux d'erreur" },
          { label: "Docs", value: "Disponibles", sub: "Swagger" },
        ]}
      />
    </DashboardLayout>
  );
}
