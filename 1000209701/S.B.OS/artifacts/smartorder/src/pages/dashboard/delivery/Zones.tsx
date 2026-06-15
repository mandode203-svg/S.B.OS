import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Zones() {
  return (
    <DashboardLayout>
      <MockPage
        title="Zones de Livraison"
        description="Définissez vos zones et tarifs de livraison."
        stats={[
          { label: "Zones actives", value: "6", sub: "Configurées" },
          { label: "Zone la + demandée", value: "Bonamoussadi", sub: "42 livraisons" },
          { label: "Tarif moyen", value: "800 FCFA", sub: "Par livraison" },
          { label: "Rayon max", value: "15 km", sub: "Zone étendue" },
        ]}
      />
    </DashboardLayout>
  );
}
