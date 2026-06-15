import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          s.container,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.logoContainer}>
          <View style={s.logoBox}>
            <Feather name="shopping-bag" size={32} color={colors.primaryForeground} />
          </View>
          <Text style={s.logoTitle}>
            SmartOrder <Text style={s.logoAI}>AI</Text>
          </Text>
          <Text style={s.logoSub}>Espace Marchand</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Connexion</Text>
          <Text style={s.cardSub}>Accédez à votre tableau de bord</Text>

          <View style={s.inputGroup}>
            <Text style={s.label}>Email</Text>
            <View style={s.inputWrapper}>
              <Feather name="mail" size={18} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="vous@exemple.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Mot de passe</Text>
            <View style={s.inputWrapper}>
              <Feather name="lock" size={18} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={s.eyeBtn}>
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [s.loginBtn, pressed && s.loginBtnPressed, loading && s.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={s.loginBtnText}>Se connecter</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      justifyContent: "center",
      gap: 32,
    },
    logoContainer: {
      alignItems: "center",
      gap: 8,
    },
    logoBox: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    logoTitle: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    logoAI: {
      color: colors.primary,
    },
    logoSub: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    cardSub: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: -8,
    },
    inputGroup: { gap: 6 },
    label: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 50,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
    },
    eyeBtn: { padding: 4 },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.destructive + "20",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    errorText: {
      color: colors.destructive,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
    loginBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    loginBtnPressed: { opacity: 0.8 },
    loginBtnDisabled: { opacity: 0.6 },
    loginBtnText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: "700" as const,
      fontFamily: "Inter_700Bold",
    },
  });
