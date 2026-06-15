import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getToken, setToken, removeToken, getStoredBusiness, setBusiness } from "@/lib/utils";

export interface Business {
  id: string;
  slug: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  address?: string | null;
  logoUrl?: string | null;
  plan: string;
  createdAt: string;
  trialEndsAt?: string | null;
  active?: boolean;
}

interface AuthContextValue {
  token: string | null;
  business: Business | null;
  isLoading: boolean;
  login: (token: string, business: Business) => void;
  logout: () => void;
  updateBusiness: (b: Business) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [business, setBusinessState] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    const b = getStoredBusiness();
    if (t) setTokenState(t);
    if (b) setBusinessState(b as Business);

    if (t) {
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setBusinessState(data);
            setBusiness(data);
          } else {
            removeToken();
            setTokenState(null);
            setBusinessState(null);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((newToken: string, newBusiness: Business) => {
    setToken(newToken);
    setBusiness(newBusiness);
    setTokenState(newToken);
    setBusinessState(newBusiness);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setBusinessState(null);
  }, []);

  const updateBusiness = useCallback((b: Business) => {
    setBusiness(b);
    setBusinessState(b);
  }, []);

  return (
    <AuthContext.Provider value={{ token, business, isLoading, login, logout, updateBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
