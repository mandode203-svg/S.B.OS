-- Migration: Add TikTok Live Commerce columns
-- Run this in your Supabase SQL editor

-- Add tiktok_username to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS tiktok_username TEXT;

-- Add tiktok_code to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS tiktok_code TEXT;

-- Optional: index for fast product lookup by tiktok_code per store
CREATE INDEX IF NOT EXISTS idx_products_tiktok_code ON products (store_id, tiktok_code)
  WHERE tiktok_code IS NOT NULL;
