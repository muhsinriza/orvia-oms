-- Orvia OMS — PostgreSQL schema
-- Run once on a fresh database: psql -U orvia -d orvia -f schema.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('admin','purchasing','accounting','quality','sales','field');
CREATE TYPE order_status AS ENUM ('draft','confirmed','in_transit','arrived','completed','delivered','cancelled');

-- Session store (managed by connect-pg-simple)
-- Table created automatically by the session middleware on first run.

-- Profiles (users)
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'purchasing',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  country       TEXT,
  city          TEXT,
  address       TEXT,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  tax_number    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  country       TEXT,
  city          TEXT,
  address       TEXT,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  tax_number    TEXT,
  notes         TEXT,
  gst_no        TEXT,
  iec_no        TEXT,
  pan_no        TEXT,
  fssai_no      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  variety    TEXT,
  category   TEXT,
  unit       TEXT NOT NULL DEFAULT 'kg',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequences for party_no auto-generation (reset per year via trigger logic)
CREATE SEQUENCE IF NOT EXISTS po_seq START 1;
CREATE SEQUENCE IF NOT EXISTS so_seq START 1;

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_no       TEXT UNIQUE NOT NULL,
  supplier_id    UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  product_id     UUID REFERENCES products(id)  ON DELETE SET NULL,
  variety        TEXT,
  origin         TEXT,
  quantity_kg    NUMERIC(12,2),
  price_per_unit NUMERIC(12,4),
  currency       TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT,
  payment_term   TEXT,
  incoterm       TEXT,
  port_loading   TEXT,
  port_discharge TEXT,
  shipment_date  DATE,
  delivery_date  DATE,
  transport_mode TEXT,
  box_type       TEXT,
  box_weight_kg  NUMERIC(8,3),
  pallets        INTEGER,
  quality_notes  TEXT,
  required_docs  JSONB NOT NULL DEFAULT '{}',
  notes          TEXT,
  status         order_status NOT NULL DEFAULT 'draft',
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_no       TEXT UNIQUE NOT NULL,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  product_id     UUID REFERENCES products(id)  ON DELETE SET NULL,
  variety        TEXT,
  origin         TEXT,
  quantity_kg    NUMERIC(12,2),
  price_per_unit NUMERIC(12,4),
  currency       TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT,
  payment_term   TEXT,
  incoterm       TEXT,
  port_loading   TEXT,
  port_discharge TEXT,
  shipment_date  DATE,
  delivery_date  DATE,
  transport_mode TEXT,
  box_type       TEXT,
  box_weight_kg  NUMERIC(8,3),
  pallets        INTEGER,
  quality_notes  TEXT,
  required_docs  JSONB NOT NULL DEFAULT '{}',
  notes          TEXT,
  status         order_status NOT NULL DEFAULT 'draft',
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order Links (PO ↔ SO many-to-many)
CREATE TABLE IF NOT EXISTS order_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id    UUID NOT NULL REFERENCES sales_orders(id)    ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  linked_kg         NUMERIC(12,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sales_order_id, purchase_order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_po_status      ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_supplier    ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_so_status      ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_customer    ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_links_so       ON order_links(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_links_po       ON order_links(purchase_order_id);

-- Trigger function: generate party_no for purchase_orders
CREATE OR REPLACE FUNCTION generate_po_party_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  yr   TEXT;
  seq  INT;
BEGIN
  yr  := to_char(now(), 'YYYY');
  seq := nextval('po_seq');
  NEW.party_no := 'PO-' || yr || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_po_party_no ON purchase_orders;
CREATE TRIGGER trg_po_party_no
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.party_no IS NULL OR NEW.party_no = '')
  EXECUTE FUNCTION generate_po_party_no();

-- Trigger function: generate party_no for sales_orders
CREATE OR REPLACE FUNCTION generate_so_party_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  yr   TEXT;
  seq  INT;
BEGIN
  yr  := to_char(now(), 'YYYY');
  seq := nextval('so_seq');
  NEW.party_no := 'SO-' || yr || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_so_party_no ON sales_orders;
CREATE TRIGGER trg_so_party_no
  BEFORE INSERT ON sales_orders
  FOR EACH ROW
  WHEN (NEW.party_no IS NULL OR NEW.party_no = '')
  EXECUTE FUNCTION generate_so_party_no();

-- -------------------------------------------------------
-- Sample data
-- -------------------------------------------------------

-- Admin user: admin@orvia.com / admin123
-- bcrypt hash of 'admin123' with cost 10
INSERT INTO profiles (email, password_hash, full_name, role)
VALUES (
  'admin@orvia.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhy',
  'Admin',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Suppliers
INSERT INTO suppliers (name, country, city, contact_name, email, phone) VALUES
  ('Anadolu Tarım A.Ş.',    'Türkiye', 'Ankara',    'Mehmet Yılmaz', 'mehmet@anadolutarim.com.tr', '+90 312 555 0001'),
  ('Ege Meyve Sebze Ltd.',  'Türkiye', 'İzmir',     'Ayşe Kaya',     'ayse@egemeyve.com',          '+90 232 555 0002'),
  ('Akdeniz İhracat A.Ş.', 'Türkiye', 'Antalya',   'Hasan Demir',   'hasan@akdenizih.com',        '+90 242 555 0003')
ON CONFLICT DO NOTHING;

-- Customers
INSERT INTO customers (name, country, city, contact_name, email, phone) VALUES
  ('Rotterdam Fresh B.V.',   'Hollanda',  'Rotterdam', 'Jan van Berg',     'jan@rotterdamfresh.nl',   '+31 10 555 0001'),
  ('Berlin Frucht GmbH',     'Almanya',   'Berlin',    'Klaus Müller',      'k.muller@berlinfrucht.de','+49 30 555 0002'),
  ('Paris Primeur SARL',     'Fransa',    'Paris',     'Marie Dupont',      'marie@parisprimeur.fr',   '+33 1 555 0003')
ON CONFLICT DO NOTHING;

-- Products
INSERT INTO products (name, variety, category, unit) VALUES
  ('Elma',       'Fuji',        'Meyve', 'kg'),
  ('Portakal',   'Washington',  'Meyve', 'kg'),
  ('Limon',      'Enterdonato', 'Meyve', 'kg'),
  ('Nar',        'Hicaznar',    'Meyve', 'kg'),
  ('Kiraz',      '0900 Ziraat', 'Meyve', 'kg'),
  ('Şeftali',    'Alberta',     'Meyve', 'kg'),
  ('Kayısı',     'Hacıhaliloğlu','Meyve','kg'),
  ('Karpuz',     'Crisby',      'Meyve', 'kg'),
  ('Kavun',      'Ananas',      'Meyve', 'kg'),
  ('Üzüm',       'Sultani',     'Meyve', 'kg')
ON CONFLICT DO NOTHING;
