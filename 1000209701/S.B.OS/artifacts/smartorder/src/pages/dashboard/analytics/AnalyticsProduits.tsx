import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function AnalyticsProduits() {
  return (
    <DashboardLayout>
      <MockPage
        title="Analytics — Produits"
        description="Performance de vos produits."
        stats={[
          { label: "Produit #1", value: "Poulet braisé", sub: "1er ce mois" },
          { label: "Produits sans vente", value: "12", sub: "Ce mois" },
          { label: "Marge top produit", value: "72%", sub: "Boissons" },
          { label: "Produits tendance", value: "5", sub: "En hausse" },
        ]}
      />
    </DashboardLayout>
  );
}
