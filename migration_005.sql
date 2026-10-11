-- Migration 005: Multi-container support for sales orders
-- Each sales order can now have multiple containers, each with its own packing list data

CREATE TABLE IF NOT EXISTS sales_order_containers (
  id               SERIAL PRIMARY KEY,
  sales_order_id   INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  container_number TEXT    NOT NULL DEFAULT '',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  packing_list_data JSONB,         -- { rows: [...], palletCount: N } per container
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soc_sales_order_id ON sales_order_containers(sales_order_id, sort_order);

-- Migrate existing single container_number values into the new table
INSERT INTO sales_order_containers (sales_order_id, container_number, sort_order, packing_list_data)
SELECT
  id,
  container_number,
  0,
  packing_list_data
FROM sales_orders
WHERE container_number IS NOT NULL AND container_number <> ''
ON CONFLICT DO NOTHING;
