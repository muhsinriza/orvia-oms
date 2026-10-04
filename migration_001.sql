-- Migration 001: Ürün paketleme alanları + sipariş tipleri

-- 1. products tablosuna paketleme alanları
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit         text    NOT NULL DEFAULT 'kg',   -- kg, kutu, adet, palet
  ADD COLUMN IF NOT EXISTS box_net_kg   numeric(10,3),                   -- kutu net ağırlık
  ADD COLUMN IF NOT EXISTS box_gross_kg numeric(10,3),                   -- kutu brüt ağırlık
  ADD COLUMN IF NOT EXISTS units_per_box integer,                        -- kutu başına adet (adet ürünler)
  ADD COLUMN IF NOT EXISTS boxes_per_pallet integer;                     -- palet başına kutu

-- 2. purchase_orders tablosuna tip alanı
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_type') THEN
    CREATE TYPE purchase_type AS ENUM ('ithalat', 'yerli');
  END IF;
END $$;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS purchase_type purchase_type NOT NULL DEFAULT 'ithalat',
  ADD COLUMN IF NOT EXISTS origin_country text,        -- ithalat: menşei ülke
  ADD COLUMN IF NOT EXISTS customs_ref    text;        -- ithalat: gümrük ref no

-- 3. sales_orders tablosuna tip alanı
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_type') THEN
    CREATE TYPE sales_type AS ENUM ('ihracat', 'yerli', 'transit');
  END IF;
END $$;

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS sales_type      sales_type NOT NULL DEFAULT 'ihracat',
  ADD COLUMN IF NOT EXISTS dest_country    text,       -- ihracat: varış ülkesi
  ADD COLUMN IF NOT EXISTS incoterms       text,       -- ihracat: teslim şekli (FOB, CIF vb.)
  ADD COLUMN IF NOT EXISTS transit_entry   text,       -- transit: giriş gümrüğü
  ADD COLUMN IF NOT EXISTS transit_exit    text;       -- transit: çıkış gümrüğü
