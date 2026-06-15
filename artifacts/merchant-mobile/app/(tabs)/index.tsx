import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getDailyRevenue } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[statStyles(colors).card, { flex: 1 }]}>
      <View style={[statStyles(colors).iconBox, { backgroundColor: color + "20" }]}>
        <Feather name={icon as Parameters<typeof Feather>[0]["name"]} size={20} color={color} />
      </View>
      <Text style={statStyles(colors).value}>{value}</Text>
      <Text style={statStyles(colors).label}>{label}</Text>
      {sub ? <Text style={statStyles(colors).sub}>{sub}</Text> : null}
    </View>
  );
}

const statStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 2,
    },
    value: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    label: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    sub: {
      fontSize: 11,
      color: colors.primary,
      fontFamily: "Inter_500Medium",
    },
  });

function RevenueBar({
  value,
  max,
  label,
  colors,
}: {
  value: number;
  max: number;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>{label}</Text>
        <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: "Inter_500Medium" }}>
          {value.toLocaleString()} FCFA
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
        <View
          style={{
            height: 6,
            width: `${pct * 100}%`,
            backgroundColor: colors.primary,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { business } = useAuth();

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isRefetching,
  } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => getDashboardStats(),
    refetchInterval: 60000,
  });

  const { data: revenue } = useQuery({
    queryKey: ["dailyRevenue"],
    queryFn: () => getDailyRevenue({ days: 7 }),
  });

  const s = styles(colors);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.container, { paddingTop: topInset + 16, paddingBottom: insets.bottom + 100 }]}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetchStats} tintColor={colors.primary} />
      }
    >
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Bonjour 👋</Text>
          <Text style={s.businessName}>{business?.name ?? "Mon Commerce"}</Text>
        </View>
        <View style={s.planBadge}>
          <Text style={s.planText}>{business?.plan ?? "Free"}</Text>
        </View>
      </View>

      {statsLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={s.loadingText}>Chargement des stats...</Text>
        </View>
      ) : (
        <>
          <Text style={s.sectionTitle}>Aujourd'hui</Text>
          <View style={s.statsRow}>
            <StatCard
              icon="dollar-sign"
              label="Revenus"
              value={`${((stats as { todayRevenue?: number })?.todayRevenue ?? 0).toLocaleString()} FCFA`}
              color={colors.primary}
              colors={colors}
            />
            <StatCard
              icon="shopping-bag"
              label="Commandes"
              value={String((stats as { todayOrders?: number })?.todayOrders ?? 0)}
              color="#4CAF50"
              colors={colors}
            />
          </View>
          <View style={s.statsRow}>
            <StatCard
              icon="users"
              label="Clients total"
              value={String((stats as { totalClients?: number })?.totalClients ?? 0)}
              color="#2196F3"
              colors={colors}
            />
            <StatCard
              icon="heart"
              label="Fidélité"
              value={`${(stats as { loyaltyRate?: number })?.loyaltyRate ?? 0}%`}
              color="#E91E63"
              colors={colors}
            />
          </View>

          {revenue && Array.isArray(revenue) && revenue.length > 0 && (
            <View style={s.revenueCard}>
              <Text style={s.sectionTitle}>Revenus 7 derniers jours</Text>
              <View style={{ gap: 10 }}>
                {(() => {
                  const maxRev = Math.max(
                    ...revenue.map((r: { revenue?: number }) => r.revenue ?? 0),
                    1
                  );
                  return revenue.slice(-5).map(
                    (r: { date?: string; revenue?: number }, i: number) => (
                      <RevenueBar
                        key={i}
                        value={r.revenue ?? 0}
                        max={maxRev}
                        label={
                          r.date
                            ? new Date(r.date).toLocaleDateString("fr-FR", {
                                weekday: "short",
                                day: "numeric",
                              })
                            : `Jour ${i + 1}`
                        }
                        colors={colors}
                      />
                    )
                  );
                })()}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.background },
    container: {
      paddingHorizontal: 20,
      gap: 16,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 4,
    },
    greeting: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    businessName: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    planBadge: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    planText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
      textTransform: "capitalize",
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
    },
    loadingBox: {
      alignItems: "center",
      gap: 12,
      paddingVertical: 40,
    },
    loadingText: {
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    revenueCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
  });
