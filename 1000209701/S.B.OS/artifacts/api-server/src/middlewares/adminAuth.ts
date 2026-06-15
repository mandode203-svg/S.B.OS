import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase.js";
import type { AuthPayload } from "./auth.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "smartorder_secret_key_change_in_production";

// Comma-separated list of emails that are unconditionally granted admin access.
// Set ADMIN_EMAILS=owner@example.com in your environment secrets for easy bootstrap.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

type AuthReq = Request & { auth: AuthPayload };

/**
 * requireAdmin — must be placed AFTER requireAuth in the middleware chain.
 *
 * Access is granted when ANY of the following is true:
 *   1. The authenticated user's email is listed in ADMIN_EMAILS env var.
 *   2. The Supabase Auth user_metadata for the store owner contains { role: "admin" }.
 *
 * Returns HTTP 403 for all other cases.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  let payload: AuthPayload;
  try {
    payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as AuthPayload;
  } catch {
    res.status(401).json({ error: "Jeton invalide" });
    return;
  }

  (req as AuthReq).auth = payload;

  // Fast path — ADMIN_EMAILS env var takes precedence
  if (ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(payload.email.toLowerCase())) {
    next();
    return;
  }

  // Slow path — check Supabase Auth user_metadata.role
  (async () => {
    const { data: store } = await supabase
      .from("stores")
      .select("owner_id")
      .eq("id", payload.businessId)
      .maybeSingle();

    if (!store?.owner_id) {
      res.status(403).json({ error: "Accès refusé." });
      return;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(
      store.owner_id as string
    );

    const role = (userData?.user?.user_metadata as Record<string, unknown> | undefined)?.role;

    if (role !== "admin") {
      res.status(403).json({
        error: "Accès refusé — droits administrateur requis.",
      });
      return;
    }

    next();
  })().catch(() => {
    res.status(403).json({ error: "Accès refusé." });
  });
}
