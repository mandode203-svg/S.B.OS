import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Variantes() {
  return (
    <DashboardLayout>
      <MockPage
        title="Variantes"
        description="Gérez les variantes de taille, couleur, conditionnement."
        stats={[
          { label: "Produits avec variantes", value: "38", sub: "Sur 142" },
          { label: "Total SKUs", value: "294", sub: "Unités distinctes" },
          { label: "Variantes actives", value: "276", sub: "En vente" },
          { label: "Types de variantes", value: "5", sub: "Taille, Couleur..." },
        ]}
      />
    </DashboardLayout>
  );
}
