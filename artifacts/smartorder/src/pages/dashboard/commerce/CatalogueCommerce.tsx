import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function CatalogueCommerce() {
  return (
    <DashboardLayout>
      <MockPage
        title="Catalogue"
        description="Produits et menus disponibles à la vente."
        stats={[
          { label: "Produits actifs", value: "128", sub: "En vente" },
          { label: "Hors stock", value: "14", sub: "Indisponibles" },
          { label: "Nouveautés", value: "5", sub: "Ce mois" },
          { label: "Promotions actives", value: "3", sub: "En cours" },
        ]}
      />
    </DashboardLayout>
  );
}
