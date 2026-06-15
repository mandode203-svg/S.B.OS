import { supabase } from "./supabase.js";
import { logger } from "./logger.js";

/**
 * Runs startup migrations against the Supabase database.
 * Uses the service role key to call a raw SQL endpoint.
 * Errors are non-fatal — the server starts regardless.
 */
export async function runMigrations(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;

  if (!supabaseUrl || !serviceKey) {
    logger.warn("[migrations] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (SUPABASE_KEY) missing — skipping migrations");
    return;
  }

  const sqls = [
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_provider TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_ref      TEXT`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_url      TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_payment_ref ON invoices (payment_ref)`,
  ];

  // Strategy 1: try via supabase rpc (requires exec_sql function to exist)
  for (const sql of sqls) {
    try {
      const { error } = await supabase.rpc("exec_sql", { query: sql });
      if (error && !error.message.includes("does not exist")) {
        logger.warn({ sql, error: error.message }, "[migrations] rpc exec_sql error");
      }
    } catch {
      // rpc function not found — fall through to strategy 2
    }
  }

  // Strategy 2: call Supabase management API SQL endpoint
  // Works when the project ref can be extracted from the Supabase URL
  try {
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    const mgmtUrl    = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

    for (const sql of sqls) {
      const resp = await fetch(mgmtUrl, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        logger.debug(`[migrations] management API ${resp.status}: ${txt.slice(0, 120)}`);
      } else {
        logger.info({ sql }, "[migrations] applied via management API");
      }
    }
  } catch (err) {
    logger.debug({ err }, "[migrations] management API unreachable — manual migration may be needed");
  }

  logger.info("[migrations] startup migration check complete");
}
