-- Migration 003: Shipment tracking fields
-- Run: docker compose exec -T postgres psql -U orvia -d orvia < migration_003.sql

-- Purchase orders: tracking fields
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS tracking_number    text,    -- TIR plakası / AWB no
  ADD COLUMN IF NOT EXISTS container_number   text,    -- Konteyner no (deniz)
  ADD COLUMN IF NOT EXISTS seawaybill_number  text,    -- Seawaybill (deniz)
  ADD COLUMN IF NOT EXISTS vessel_name        text,    -- Gemi adı (deniz)
  ADD COLUMN IF NOT EXISTS flight_number      text,    -- Uçuş no (hava)
  ADD COLUMN IF NOT EXISTS driver_name        text,    -- Şoför adı (kara)
  ADD COLUMN IF NOT EXISTS driver_phone       text;    -- Şoför telefonu (kara)

-- Sales orders: tracking fields
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS tracking_number    text,
  ADD COLUMN IF NOT EXISTS container_number   text,
  ADD COLUMN IF NOT EXISTS seawaybill_number  text,
  ADD COLUMN IF NOT EXISTS vessel_name        text,
  ADD COLUMN IF NOT EXISTS flight_number      text,
  ADD COLUMN IF NOT EXISTS driver_name        text,
  ADD COLUMN IF NOT EXISTS driver_phone       text;

-- Shipment events log (timeline for both order types)
CREATE TABLE IF NOT EXISTS shipment_events (
  id            SERIAL PRIMARY KEY,
  order_type    text NOT NULL CHECK (order_type IN ('purchase','sales')),
  order_id      INTEGER NOT NULL,
  event_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type    text NOT NULL,   -- 'status_change','note','location','document'
  title         text NOT NULL,
  description   text,
  location      text,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_events_order ON shipment_events(order_type, order_id);
