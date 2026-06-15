-- Invoices table for SaaS billing management
CREATE TABLE IF NOT EXISTS invoices (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan       TEXT        NOT NULL,
  amount     NUMERIC(12, 0) NOT NULL DEFAULT 0,
  status     TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoices_store_id  ON invoices (store_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_created   ON invoices (created_at DESC);
