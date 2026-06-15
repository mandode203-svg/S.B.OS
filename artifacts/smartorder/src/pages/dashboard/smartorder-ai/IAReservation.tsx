import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function IAReservation() {
  return (
    <DashboardLayout>
      <MockPage
        title="IA Réservation"
        description="L'IA gère vos réservations automatiquement."
        badge="IA"
        stats={[
          { label: "Réservations IA", value: "64", sub: "Ce mois" },
          { label: "Annulations évitées", value: "12", sub: "Relances IA" },
          { label: "Taux confirmation", value: "94%", sub: "Auto" },
          { label: "Temps gagné", value: "8h/sem", sub: "Estimation" },
        ]}
      />
    </DashboardLayout>
  );
}
