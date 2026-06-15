import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function CommandesCommerce() {
  return (
    <DashboardLayout>
      <MockPage
        title="Commandes"
        description="Toutes les commandes de votre commerce."
        stats={[
          { label: "Commandes aujourd'hui", value: "12", sub: "Actives" },
          { label: "En cours", value: "5", sub: "À traiter" },
          { label: "Livrées", value: "7", sub: "Aujourd'hui" },
          { label: "CA du jour", value: "85 400 FCFA", sub: "Encaissé" },
        ]}
      />
    </DashboardLayout>
  );
}
