-- Migration : ajout de la colonne payment_url dans orders
-- Permet de stocker le lien FedaPay généré pour le paiement de l'acompte 25%

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Index pour retrouver rapidement les commandes par référence de paiement
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders (payment_reference)
  WHERE payment_reference IS NOT NULL;

COMMENT ON COLUMN orders.payment_url IS 'Lien FedaPay généré pour le paiement de l''acompte 25%';
COMMENT ON COLUMN orders.payment_reference IS 'Référence de transaction FedaPay après confirmation';

