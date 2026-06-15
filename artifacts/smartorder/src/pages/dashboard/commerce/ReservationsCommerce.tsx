import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function ReservationsCommerce() {
  return (
    <DashboardLayout>
      <MockPage
        title="Réservations"
        description="Gestion des réservations clients."
        stats={[
          { label: "Réservations aujourd'hui", value: "8", sub: "Confirmées" },
          { label: "En attente", value: "3", sub: "À confirmer" },
          { label: "Taux d'occupation", value: "78%", sub: "Aujourd'hui" },
          { label: "Annulations", value: "1", sub: "Ce mois: 4" },
        ]}
      />
    </DashboardLayout>
  );
}
