import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useFailedLogsCount(): number {
  const { token } = useAuth();
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/store/communication-logs/failed-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { count: number };
        setCount(data.count ?? 0);
      }
    } catch {
      // silently ignore
    }
  }, [token]);

  useEffect(() => {
    fetch_();
    intervalRef.current = setInterval(fetch_, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetch_]);

  return count;
}
