import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Entrepots() {
  return (
    <DashboardLayout>
      <MockPage
        title="Entrepôts"
        description="Gérez vos emplacements de stockage."
        stats={[
          { label: "Entrepôts", value: "3", sub: "Sites actifs" },
          { label: "Capacité totale", value: "500 m²", sub: "Utilisée à 68%" },
          { label: "Transferts en cours", value: "2", sub: "Inter-sites" },
          { label: "Entrepôt principal", value: "Douala Centre", sub: "Principal" },
        ]}
      />
    </DashboardLayout>
  );
}
