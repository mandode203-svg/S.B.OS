import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const TOKEN_KEY = "smartorder_token";
const BUSINESS_KEY = "smartorder_business";

interface Business {
  id: string;
  slug: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  plan: string;
  address?: string | null;
  logoUrl?: string | null;
  createdAt: string;
}

interface AuthContextType {
  token: string | null;
  business: Business | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  business: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedBusiness = await AsyncStorage.getItem(BUSINESS_KEY);
      if (storedToken) {
        setToken(storedToken);
        if (storedBusiness) {
          setBusiness(JSON.parse(storedBusiness));
        }
      }
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Identifiants incorrects");
    }
    const data = await res.json();
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(BUSINESS_KEY, JSON.stringify(data.business));
    setToken(data.token);
    setBusiness(data.business);
    router.replace("/(tabs)");
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(BUSINESS_KEY);
    setToken(null);
    setBusiness(null);
    router.replace("/(auth)/login");
  }, []);

  return (
    <AuthContext.Provider value={{ token, business, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
