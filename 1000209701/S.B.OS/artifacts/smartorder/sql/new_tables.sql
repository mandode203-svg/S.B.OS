-- ============================================================
-- SMARTORDER BUSINESS OS — Nouvelles tables
-- NE PAS modifier les tables existantes
-- ============================================================

-- ── STOCKSHOP ──

CREATE TABLE IF NOT EXISTS product_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  parent_id     UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  description   TEXT,
  image_url     TEXT,
  sort_order    INTEGER DEFAULT 0,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, slug)
);

CREATE TABLE IF NOT EXISTS product_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL,
  name          TEXT NOT NULL,
  sku           TEXT,
  price         NUMERIC(12,0) DEFAULT 0,
  cost_price    NUMERIC(12,0) DEFAULT 0,
  stock_qty     INTEGER DEFAULT 0,
  attributes    JSONB DEFAULT '{}',
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  is_default    BOOLEAN DEFAULT FALSE,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL,
  variant_id    UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  warehouse_id  UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('in','out','transfer','adjustment','loss')),
  qty           INTEGER NOT NULL,
  unit_cost     NUMERIC(12,0),
  reference     TEXT,
  note          TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  city          TEXT,
  country       TEXT DEFAULT 'CM',
  payment_terms TEXT,
  rating        NUMERIC(3,1),
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  warehouse_id  UUID REFERENCES warehouses(id),
  reference     TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','confirmed','partial','received','cancelled')),
  order_date    DATE DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  total_amount  NUMERIC(12,0) DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        TEXT NOT NULL,
  variant_id        UUID REFERENCES product_variants(id),
  qty_ordered       INTEGER NOT NULL,
  qty_received      INTEGER DEFAULT 0,
  unit_cost         NUMERIC(12,0) NOT NULL,
  total_cost        NUMERIC(12,0) GENERATED ALWAYS AS (qty_ordered * unit_cost) STORED
);

-- ── COMMERCE ──

CREATE TABLE IF NOT EXISTS invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id      TEXT,
  client_id     TEXT,
  number        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  issue_date    DATE DEFAULT CURRENT_DATE,
  due_date      DATE,
  paid_date     DATE,
  subtotal      NUMERIC(12,0) DEFAULT 0,
  tax_rate      NUMERIC(5,2) DEFAULT 0,
  tax_amount    NUMERIC(12,0) DEFAULT 0,
  total         NUMERIC(12,0) DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, number)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty         NUMERIC(10,2) DEFAULT 1,
  unit_price  NUMERIC(12,0) NOT NULL,
  total       NUMERIC(12,0) GENERATED ALWAYS AS (qty * unit_price) STORED
);

CREATE TABLE IF NOT EXISTS pos_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  cashier_id    TEXT,
  opened_at     TIMESTAMPTZ DEFAULT NOW(),
  closed_at     TIMESTAMPTZ,
  opening_cash  NUMERIC(12,0) DEFAULT 0,
  closing_cash  NUMERIC(12,0),
  total_sales   NUMERIC(12,0) DEFAULT 0,
  total_tx      INTEGER DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed'))
);

-- ── DELIVERY HUB ──

CREATE TABLE IF NOT EXISTS delivery_drivers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT,
  vehicle_type     TEXT CHECK (vehicle_type IN ('moto','velo','voiture','pied')),
  vehicle_plate    TEXT,
  status           TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','busy')),
  rating           NUMERIC(3,1) DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  delivery_fee      NUMERIC(12,0) DEFAULT 0,
  min_order         NUMERIC(12,0) DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 30,
  polygon           JSONB,
  active            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id         TEXT,
  driver_id        UUID REFERENCES delivery_drivers(id) ON DELETE SET NULL,
  zone_id          UUID REFERENCES delivery_zones(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','picked_up','on_the_way','delivered','failed','cancelled')),
  pickup_address   TEXT,
  delivery_address TEXT NOT NULL,
  delivery_fee     NUMERIC(12,0) DEFAULT 0,
  distance_km      NUMERIC(6,2),
  assigned_at      TIMESTAMPTZ,
  picked_at        TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  proof_photo      TEXT,
  signature        TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
  lat         NUMERIC(10,7) NOT NULL,
  lng         NUMERIC(10,7) NOT NULL,
  accuracy    NUMERIC(6,1),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CRM ──

CREATE TABLE IF NOT EXISTS customer_segments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  color        TEXT DEFAULT '#6366f1',
  criteria     JSONB DEFAULT '{}',
  is_auto      BOOLEAN DEFAULT FALSE,
  member_count INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_segment_members (
  segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  client_id  TEXT NOT NULL,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (segment_id, client_id)
);

CREATE TABLE IF NOT EXISTS loyalty_programs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  points_per_fcfa NUMERIC(6,2) DEFAULT 1,
  fcfa_per_point  NUMERIC(6,2) DEFAULT 1,
  min_redemption  INTEGER DEFAULT 100,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id      TEXT NOT NULL,
  program_id     UUID REFERENCES loyalty_programs(id),
  points_balance INTEGER DEFAULT 0,
  total_earned   INTEGER DEFAULT 0,
  total_redeemed INTEGER DEFAULT 0,
  tier           TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, client_id)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('earn','redeem','expire','adjust')),
  points      INTEGER NOT NULL,
  order_id    TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  phone               TEXT,
  email               TEXT,
  source              TEXT CHECK (source IN ('whatsapp','instagram','facebook','tiktok','web','referral','manual','other')),
  status              TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal','negotiation','won','lost')),
  score               INTEGER DEFAULT 0,
  estimated_value     NUMERIC(12,0),
  assigned_to         TEXT,
  notes               TEXT,
  converted_client_id TEXT,
  converted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT DEFAULT '#6366f1',
  sort_order      INTEGER DEFAULT 0,
  win_probability NUMERIC(5,2) DEFAULT 0
);

-- ── FINANCE ──

CREATE TABLE IF NOT EXISTS accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('cash','mobile_money','bank','other')),
  provider    TEXT,
  balance     NUMERIC(12,0) DEFAULT 0,
  currency    TEXT DEFAULT 'XAF',
  is_default  BOOLEAN DEFAULT FALSE,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  color          TEXT DEFAULT '#6366f1',
  icon           TEXT,
  budget_monthly NUMERIC(12,0)
);

CREATE TABLE IF NOT EXISTS expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  account_id   UUID REFERENCES accounts(id),
  category_id  UUID REFERENCES expense_categories(id),
  description  TEXT NOT NULL,
  amount       NUMERIC(12,0) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  receipt_url  TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence   TEXT CHECK (recurrence IN ('daily','weekly','monthly','yearly')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_forecasts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period_month      INTEGER NOT NULL,
  period_year       INTEGER NOT NULL,
  forecast_revenue  NUMERIC(12,0),
  forecast_expenses NUMERIC(12,0),
  forecast_profit   NUMERIC(12,0),
  confidence_score  NUMERIC(5,2),
  ai_insights       JSONB DEFAULT '[]',
  generated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, period_month, period_year)
);

-- ── SMARTORDER AI ──

CREATE TABLE IF NOT EXISTS ai_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL CHECK (channel IN ('whatsapp','facebook','instagram','tiktok','webchat')),
  name        TEXT NOT NULL,
  credentials JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT FALSE,
  webhook_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, channel)
);

CREATE TABLE IF NOT EXISTS ai_response_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  trigger_keywords TEXT[],
  channel          TEXT CHECK (channel IN ('whatsapp','facebook','instagram','tiktok','webchat','all')),
  language         TEXT DEFAULT 'fr',
  template_text    TEXT NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  usage_count      INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                TEXT CHECK (type IN ('broadcast','drip','event_trigger','retargeting')),
  channel             TEXT NOT NULL,
  status              TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','running','paused','completed','cancelled')),
  audience_segment_id UUID REFERENCES customer_segments(id),
  message_template    TEXT,
  scheduled_at        TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  sent_count          INTEGER DEFAULT 0,
  open_count          INTEGER DEFAULT 0,
  click_count         INTEGER DEFAULT 0,
  conversion_count    INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── MARKETPLACE ──

CREATE TABLE IF NOT EXISTS marketplace_modules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT CHECK (category IN ('module','extension','connector','template')),
  version       TEXT DEFAULT '1.0.0',
  author        TEXT,
  icon_url      TEXT,
  price         NUMERIC(12,0) DEFAULT 0,
  is_free       BOOLEAN DEFAULT TRUE,
  rating        NUMERIC(3,1) DEFAULT 0,
  install_count INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_modules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  module_id    UUID NOT NULL REFERENCES marketplace_modules(id),
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active    BOOLEAN DEFAULT TRUE,
  config       JSONB DEFAULT '{}',
  UNIQUE(business_id, module_id)
);

-- ── PARAMÈTRES ──

CREATE TABLE IF NOT EXISTS business_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, name)
);

CREATE TABLE IF NOT EXISTS business_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role_id      UUID REFERENCES business_roles(id),
  email        TEXT NOT NULL,
  name         TEXT,
  avatar_url   TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  invited_at   TIMESTAMPTZ DEFAULT NOW(),
  joined_at    TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  UNIQUE(business_id, email)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  key_prefix   TEXT NOT NULL,
  permissions  TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEX ──

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product  ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_business ON inventory_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_business          ON deliveries(business_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver            ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status            ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_expenses_business            ON expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date                ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_leads_business               ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_status                 ON leads(status);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_client      ON loyalty_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver      ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_delivery    ON driver_locations(delivery_id);
