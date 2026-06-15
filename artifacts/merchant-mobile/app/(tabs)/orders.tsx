import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders, updateOrderStatus } from "@workspace/api-client-react";
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
import { useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#E8A020",
  confirmed: "#2196F3",
  preparing: "#9C27B0",
  ready: "#4CAF50",
  delivered: "#607D8B",
  cancelled: "#F44336",
};

const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "delivered",
};

const FILTERS: Array<{ label: string; value: string }> = [
  { label: "Toutes", value: "" },
  { label: "Attente", value: "pending" },
  { label: "Confirmées", value: "confirmed" },
  { label: "Prêtes", value: "ready" },
  { label: "Livrées", value: "delivered" },
];

interface Order {
  id: string;
  orderNumber?: string;
  clientName?: string;
  status: OrderStatus;
  total?: number;
  orderType?: string;
  createdAt: string;
  items?: Array<{ productName?: string; quantity?: number }>;
}

function OrderCard({
  order,
  onAdvance,
  advancing,
  colors,
}: {
  order: Order;
  onAdvance: (id: string, status: OrderStatus) => void;
  advancing: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const next = STATUS_NEXT[order.status];
  const statusColor = STATUS_COLORS[order.status] ?? colors.mutedForeground;

  return (
    <View style={cardStyles(colors).card}>
      <View style={cardStyles(colors).header}>
        <View style={{ flex: 1 }}>
          <Text style={cardStyles(colors).orderNum}>
            #{order.orderNumber ?? order.id.slice(0, 8)}
          </Text>
          <Text style={cardStyles(colors).client}>
            {order.clientName ?? "Client inconnu"}
          </Text>
        </View>
        <View style={[cardStyles(colors).badge, { backgroundColor: statusColor + "20" }]}>
          <View style={[cardStyles(colors).dot, { backgroundColor: statusColor }]} />
          <Text style={[cardStyles(colors).badgeText, { color: statusColor }]}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Text>
        </View>
      </View>

      {order.items && order.items.length > 0 && (
        <Text style={cardStyles(colors).items} numberOfLines={2}>
          {order.items
            .map((i) => `${i.quantity ?? 1}x ${i.productName ?? "Article"}`)
            .join(" · ")}
        </Text>
      )}

      <View style={cardStyles(colors).footer}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="clock" size={12} color={colors.mutedForeground} />
          <Text style={cardStyles(colors).time}>
            {new Date(order.createdAt).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          {order.orderType ? (
            <View style={cardStyles(colors).typeBadge}>
              <Text style={cardStyles(colors).typeText}>{order.orderType}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={cardStyles(colors).total}>
            {(order.total ?? 0).toLocaleString()} FCFA
          </Text>
          {next && (
            <Pressable
              style={({ pressed }) => [
                cardStyles(colors).advanceBtn,
                pressed && { opacity: 0.7 },
                advancing && { opacity: 0.5 },
              ]}
              onPress={() => onAdvance(order.id, next)}
              disabled={advancing}
            >
              {advancing ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={cardStyles(colors).advanceBtnText}>
                    {STATUS_LABELS[next]}
                  </Text>
                  <Feather name="arrow-right" size={14} color={colors.primaryForeground} />
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const cardStyles = (colors: ReturnType<typeof useColors>) =>
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
    orderNum: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    client: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
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
    items: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    time: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    typeBadge: {
      backgroundColor: colors.secondary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    typeText: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textTransform: "capitalize",
    },
    total: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.primary,
      fontFamily: "Inter_700Bold",
    },
    advanceBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    advanceBtnText: {
      fontSize: 12,
      color: colors.primaryForeground,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
  });

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { clearNewOrders } = useNotifications();
  const [activeFilter, setActiveFilter] = useState("");
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const { data: orders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["orders", activeFilter],
    queryFn: () => listOrders({ status: activeFilter || undefined }),
    refetchInterval: 30000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const handleAdvance = async (id: string, status: OrderStatus) => {
    setAdvancingId(id);
    try {
      await mutation.mutateAsync({ id, status });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAdvancingId(null);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s(colors).header, { paddingTop: topInset + 16 }]}>
        <Text style={s(colors).title}>Commandes</Text>
      </View>

      <View style={s(colors).filterBar}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[
              s(colors).filterChip,
              activeFilter === f.value && s(colors).filterChipActive,
            ]}
            onPress={() => {
              setActiveFilter(f.value);
              if (f.value === "pending") clearNewOrders();
            }}
          >
            <Text
              style={[
                s(colors).filterText,
                activeFilter === f.value && s(colors).filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={s(colors).loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={(orders as Order[]) ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onAdvance={handleAdvance}
              advancing={advancingId === item.id}
              colors={colors}
            />
          )}
          scrollEnabled={!!((orders as Order[])?.length ?? 0)}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s(colors).empty}>
              <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
              <Text style={s(colors).emptyTitle}>Aucune commande</Text>
              <Text style={s(colors).emptyText}>Les commandes apparaîtront ici</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = (colors: ReturnType<typeof useColors>) =>
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
      flexWrap: "wrap",
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
    filterTextActive: {
      color: colors.primaryForeground,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
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
