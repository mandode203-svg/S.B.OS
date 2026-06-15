-- Add online payment columns to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_ref      TEXT,
  ADD COLUMN IF NOT EXISTS payment_url      TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_payment_ref ON invoices (payment_ref);
