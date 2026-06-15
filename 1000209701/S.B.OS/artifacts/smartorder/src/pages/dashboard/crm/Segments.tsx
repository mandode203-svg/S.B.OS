import DashboardLayout from "@/components/layout/DashboardLayout";
import MockPage from "@/components/MockPage";

export default function Segments() {
  return (
    <DashboardLayout>
      <MockPage
        title="Segments"
        description="Segmentez votre base clients pour cibler."
        stats={[
          { label: "Segments actifs", value: "8", sub: "Configurés" },
          { label: "Segment + gros", value: "Réguliers", sub: "480 clients" },
          { label: "Segments IA", value: "3", sub: "Auto-générés" },
          { label: "Clients non segmentés", value: "240", sub: "À classer" },
        ]}
      />
    </DashboardLayout>
  );
}
