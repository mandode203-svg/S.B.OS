-- Create withdrawals table for merchant payout requests
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount          numeric(12, 2) NOT NULL,
  fee_amount      numeric(12, 2) NOT NULL DEFAULT 0,
  net_amount      numeric(12, 2) NOT NULL DEFAULT 0,
  payout_method   text NOT NULL,
  payout_details  text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Add payment_status and payment_reference columns to orders if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_reference'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN payment_reference text;
  END IF;
END
$$;

-- Ensure trial_ends_at exists on stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE public.stores ADD COLUMN trial_ends_at timestamptz;
  END IF;
END
$$;

-- Row Level Security for withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Store owners can read their own withdrawals
CREATE POLICY "store_owner_read_withdrawals"
  ON public.withdrawals FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- Store owners can insert their own withdrawals
CREATE POLICY "store_owner_insert_withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- Service role can do anything (used by backend)
CREATE POLICY "service_role_all_withdrawals"
  ON public.withdrawals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
