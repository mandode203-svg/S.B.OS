import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listReservations, updateReservation } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  completed: "Terminée",
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: "#E8A020",
  confirmed: "#4CAF50",
  cancelled: "#F44336",
  completed: "#607D8B",
};

const FILTERS: Array<{ label: string; value: string }> = [
  { label: "Toutes", value: "" },
  { label: "Attente", value: "pending" },
  { label: "Confirmées", value: "confirmed" },
  { label: "Terminées", value: "completed" },
];

interface Reservation {
  id: string;
  clientName?: string;
  partySize?: number;
  date?: string;
  time?: string;
  status: ReservationStatus;
  notes?: string;
  createdAt: string;
}

function ReservationCard({
  reservation,
  onConfirm,
  onCancel,
  confirming,
  cancelling,
  colors,
}: {
  reservation: Reservation;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  confirming: boolean;
  cancelling: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const statusColor = STATUS_COLORS[reservation.status] ?? colors.mutedForeground;

  return (
    <View style={cStyles(colors).card}>
      <View style={cStyles(colors).header}>
        <View style={{ flex: 1 }}>
          <Text style={cStyles(colors).name}>{reservation.clientName ?? "Client inconnu"}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            {reservation.partySize ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="users" size={12} color={colors.mutedForeground} />
                <Text style={cStyles(colors).meta}>{reservation.partySize} pers.</Text>
              </View>
            ) : null}
            {reservation.date ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="calendar" size={12} color={colors.mutedForeground} />
                <Text style={cStyles(colors).meta}>
                  {new Date(reservation.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>
            ) : null}
            {reservation.time ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="clock" size={12} color={colors.mutedForeground} />
                <Text style={cStyles(colors).meta}>{reservation.time}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={[cStyles(colors).badge, { backgroundColor: statusColor + "20" }]}>
          <View style={[cStyles(colors).dot, { backgroundColor: statusColor }]} />
          <Text style={[cStyles(colors).badgeText, { color: statusColor }]}>
            {STATUS_LABELS[reservation.status] ?? reservation.status}
          </Text>
        </View>
      </View>

      {reservation.notes ? (
        <Text style={cStyles(colors).notes} numberOfLines={2}>
          {reservation.notes}
        </Text>
      ) : null}

      {reservation.status === "pending" && (
        <View style={cStyles(colors).actions}>
          <Pressable
            style={({ pressed }) => [
              cStyles(colors).cancelBtn,
              pressed && { opacity: 0.7 },
              cancelling && { opacity: 0.5 },
            ]}
            onPress={() => onCancel(reservation.id)}
            disabled={cancelling || confirming}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Text style={cStyles(colors).cancelBtnText}>Annuler</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              cStyles(colors).confirmBtn,
              pressed && { opacity: 0.7 },
              confirming && { opacity: 0.5 },
            ]}
            onPress={() => onConfirm(reservation.id)}
            disabled={confirming || cancelling}
          >
            {confirming ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Feather name="check" size={14} color={colors.primaryForeground} />
                <Text style={cStyles(colors).confirmBtnText}>Confirmer</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const cStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    header: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    name: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    meta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 11, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
    notes: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    actions: { flexDirection: "row", gap: 8 },
    cancelBtn: {
      flex: 1,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.destructive,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelBtnText: {
      color: colors.destructive,
      fontSize: 13,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    confirmBtn: {
      flex: 2,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    confirmBtnText: {
      color: colors.primaryForeground,
      fontSize: 13,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
  });

export default function ReservationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("");
  const [actionId, setActionId] = useState<{ id: string; type: "confirm" | "cancel" } | null>(null);

  const { data: reservations, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["reservations", activeFilter],
    queryFn: () => listReservations({ status: activeFilter || undefined }),
    refetchInterval: 30000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) =>
      updateReservation(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  const handleConfirm = async (id: string) => {
    setActionId({ id, type: "confirm" });
    try {
      await mutation.mutateAsync({ id, status: "confirmed" });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionId({ id, type: "cancel" });
    try {
      await mutation.mutateAsync({ id, status: "cancelled" });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setActionId(null);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[rs(colors).header, { paddingTop: topInset + 16 }]}>
        <Text style={rs(colors).title}>Réservations</Text>
      </View>

      <View style={rs(colors).filterBar}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[
              rs(colors).filterChip,
              activeFilter === f.value && rs(colors).filterChipActive,
            ]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text
              style={[
                rs(colors).filterText,
                activeFilter === f.value && rs(colors).filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={rs(colors).loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={(reservations as Reservation[]) ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReservationCard
              reservation={item}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              confirming={actionId?.id === item.id && actionId?.type === "confirm"}
              cancelling={actionId?.id === item.id && actionId?.type === "cancel"}
              colors={colors}
            />
          )}
          scrollEnabled={!!((reservations as Reservation[])?.length ?? 0)}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={rs(colors).empty}>
              <Feather name="calendar" size={40} color={colors.mutedForeground} />
              <Text style={rs(colors).emptyTitle}>Aucune réservation</Text>
              <Text style={rs(colors).emptyText}>Les réservations apparaîtront ici</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const rs = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    filterBar: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 8,
      marginBottom: 12,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    filterTextActive: { color: colors.primaryForeground },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    emptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
