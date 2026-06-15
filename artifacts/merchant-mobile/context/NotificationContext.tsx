import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { useAuth } from "./AuthContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextType {
  hasPermission: boolean;
  newOrderCount: number;
  clearNewOrders: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  hasPermission: false,
  newOrderCount: 0,
  clearNewOrders: () => {},
});

const POLL_INTERVAL = 30000;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const lastOrderCountRef = useRef<number | null>(null);
  const lastReservationCountRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const poll = useCallback(async () => {
    if (!token) return;
    try {
      const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
      const headers = { Authorization: `Bearer ${token}` };

      const [ordersRes, reservationsRes] = await Promise.all([
        fetch(`${baseUrl}/api/orders?status=pending`, { headers }),
        fetch(`${baseUrl}/api/reservations?status=pending`, { headers }),
      ]);

      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        const count = Array.isArray(orders) ? orders.length : 0;
        if (lastOrderCountRef.current !== null && count > lastOrderCountRef.current) {
          const diff = count - lastOrderCountRef.current;
          setNewOrderCount((prev) => prev + diff);
          if (Platform.OS !== "web" && hasPermission) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Nouvelle commande !",
                body: `${diff} nouvelle${diff > 1 ? "s" : ""} commande${diff > 1 ? "s" : ""} en attente`,
                sound: true,
              },
              trigger: null,
            });
          }
        }
        lastOrderCountRef.current = count;
      }

      if (reservationsRes.ok) {
        const reservations = await reservationsRes.json();
        const count = Array.isArray(reservations) ? reservations.length : 0;
        if (lastReservationCountRef.current !== null && count > lastReservationCountRef.current) {
          const diff = count - lastReservationCountRef.current;
          if (Platform.OS !== "web" && hasPermission) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Nouvelle réservation !",
                body: `${diff} nouvelle${diff > 1 ? "s" : ""} réservation${diff > 1 ? "s" : ""} en attente`,
                sound: true,
              },
              trigger: null,
            });
          }
        }
        lastReservationCountRef.current = count;
      }
    } catch {
    }
  }, [token, hasPermission]);

  useEffect(() => {
    if (!token) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      lastOrderCountRef.current = null;
      lastReservationCountRef.current = null;
      return;
    }
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, poll]);

  const clearNewOrders = useCallback(() => setNewOrderCount(0), []);

  return (
    <NotificationContext.Provider value={{ hasPermission, newOrderCount, clearNewOrders }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
