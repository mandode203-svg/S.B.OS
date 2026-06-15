import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={pStyles(colors).infoRow}>
      <View style={pStyles(colors).infoIcon}>
        <Feather name={icon as Parameters<typeof Feather>[0]["name"]} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={pStyles(colors).infoLabel}>{label}</Text>
        <Text style={pStyles(colors).infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const pStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    infoLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    infoValue: {
      fontSize: 14,
      color: colors.foreground,
      fontWeight: "500" as const,
      fontFamily: "Inter_500Medium",
    },
  });

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { business, logout } = useAuth();
  const { hasPermission } = useNotifications();
  const [loggingOut, setLoggingOut] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnecter",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await logout();
          },
        },
      ]
    );
  };

  const s = styles(colors);

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[
        s.container,
        {
          paddingTop: topInset + 16,
          paddingBottom: insets.bottom + 100,
        },
      ]}
    >
      <Text style={s.title}>Profil</Text>

      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(business?.name ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={s.avatarName}>{business?.name ?? "Mon Commerce"}</Text>
          <Text style={s.avatarType}>{business?.type ?? "Commerce"}</Text>
          <View style={s.planRow}>
            <View style={s.planBadge}>
              <Text style={s.planText}>{business?.plan ?? "Free"}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Informations</Text>
        {business?.email && (
          <InfoRow icon="mail" label="Email" value={business.email} colors={colors} />
        )}
        {business?.phone && (
          <InfoRow icon="phone" label="Téléphone" value={business.phone} colors={colors} />
        )}
        {business?.address && (
          <InfoRow icon="map-pin" label="Adresse" value={business.address} colors={colors} />
        )}
        {business?.createdAt && (
          <InfoRow
            icon="calendar"
            label="Membre depuis"
            value={new Date(business.createdAt).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
            colors={colors}
          />
        )}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Notifications push</Text>
        <View style={s.notifRow}>
          <Feather
            name={hasPermission ? "bell" : "bell-off"}
            size={18}
            color={hasPermission ? colors.primary : colors.mutedForeground}
          />
          <Text style={[s.notifText, { color: hasPermission ? colors.foreground : colors.mutedForeground }]}>
            {hasPermission
              ? "Activées — vous recevrez des alertes pour les nouvelles commandes et réservations"
              : "Désactivées — activez les dans les paramètres de votre téléphone"}
          </Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Application</Text>
        <View style={s.appInfo}>
          <Text style={s.appInfoText}>SmartOrder AI Mobile</Text>
          <Text style={s.appInfoVersion}>v1.0.0</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.8 }, loggingOut && { opacity: 0.5 }]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={s.logoutText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 20, gap: 20 },
    title: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    avatarSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    avatarName: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    avatarType: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textTransform: "capitalize",
    },
    planRow: { marginTop: 4 },
    planBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 20,
    },
    planText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
      textTransform: "capitalize",
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      marginBottom: 4,
    },
    notifRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
      paddingTop: 8,
    },
    notifText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
    appInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 8,
    },
    appInfoText: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    appInfoVersion: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.destructive + "15",
      borderWidth: 1,
      borderColor: colors.destructive + "40",
      borderRadius: 12,
      height: 52,
    },
    logoutText: {
      color: colors.destructive,
      fontSize: 15,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
  });
