-- Migration 004: Add India regulatory number fields to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gst_no   TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS iec_no   TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pan_no   TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fssai_no TEXT;
