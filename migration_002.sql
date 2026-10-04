-- Migration 002: Sipariş satırlarına kalibr/boy alanı

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS caliber text;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS caliber text;
