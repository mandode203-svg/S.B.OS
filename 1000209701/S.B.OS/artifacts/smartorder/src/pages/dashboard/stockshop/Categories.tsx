import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Categories() {
  return (
    <DashboardLayout>
      <MockPage
        title="Catégories"
        description="Organisez vos produits par catégories."
        stats={[
          { label: "Catégories", value: "14", sub: "Actives" },
          { label: "Sous-catégories", value: "28", sub: "Configurées" },
          { label: "Produits sans catégorie", value: "3", sub: "À assigner" },
          { label: "Catégorie top", value: "Boissons", sub: "42 produits" },
        ]}
      />
    </DashboardLayout>
  );
}
