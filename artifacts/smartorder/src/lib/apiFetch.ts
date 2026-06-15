const BACKEND_URL = import.meta.env.VITE_API_URL ?? "https://smartorder-ai-qi7q.onrender.com";

export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = path.startsWith("/") ? `${BACKEND_URL}${path}` : path;
  
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options?.headers ?? {}),
  };
  
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}
