import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Courses() {
  return (
    <DashboardLayout>
      <MockPage
        title="Courses"
        description="Suivi de toutes les livraisons."
        stats={[
          { label: "Courses aujourd'hui", value: "18", sub: "Total" },
          { label: "En cours", value: "3", sub: "Actives" },
          { label: "Livrées", value: "15", sub: "Terminées" },
          { label: "Délai moyen", value: "28 min", sub: "Livraison" },
        ]}
      />
    </DashboardLayout>
  );
}
