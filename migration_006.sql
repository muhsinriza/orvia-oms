-- Migration 006: Shipping line tracking results
-- Run: docker compose exec -T postgres psql -U orvia -d orvia < migration_006.sql

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS shipping_line      text,           -- 'cma-cgm' | 'arkas' | 'wan-hai'
  ADD COLUMN IF NOT EXISTS tracking_status    text,           -- 'In Transit', 'Discharged', 'Arrived' vb.
  ADD COLUMN IF NOT EXISTS current_port       text,           -- 'Port Said', 'Mersin' vb.
  ADD COLUMN IF NOT EXISTS vessel_imo         text,           -- IMO numarası
  ADD COLUMN IF NOT EXISTS pol               text,           -- Port of Loading
  ADD COLUMN IF NOT EXISTS pod               text,           -- Port of Discharge
  ADD COLUMN IF NOT EXISTS eta               DATE,           -- Tahmini varış
  ADD COLUMN IF NOT EXISTS ata               DATE,           -- Gerçek varış
  ADD COLUMN IF NOT EXISTS last_tracked_at   TIMESTAMPTZ,   -- Son scrape zamanı
  ADD COLUMN IF NOT EXISTS tracking_error    text;           -- Hata varsa mesajı

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS shipping_line      text,
  ADD COLUMN IF NOT EXISTS tracking_status    text,
  ADD COLUMN IF NOT EXISTS current_port       text,
  ADD COLUMN IF NOT EXISTS vessel_imo         text,
  ADD COLUMN IF NOT EXISTS pol               text,
  ADD COLUMN IF NOT EXISTS pod               text,
  ADD COLUMN IF NOT EXISTS eta               DATE,
  ADD COLUMN IF NOT EXISTS ata               DATE,
  ADD COLUMN IF NOT EXISTS last_tracked_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_error    text;
