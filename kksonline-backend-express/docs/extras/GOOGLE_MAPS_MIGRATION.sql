-- =====================================================
-- Google Maps Integration - Database Schema Migration
-- =====================================================
-- This migration adds Google Maps fields to support
-- location-based address selection and delivery tracking
-- =====================================================

-- =====================================================
-- 1. ALTER addresses TABLE
-- =====================================================
-- Purpose: Add Google Maps location data to customer addresses
-- Fields added:
--   - latitude: GPS latitude coordinate (for map positioning)
--   - longitude: GPS longitude coordinate (for map positioning)
--   - place_id: Google Places API unique identifier (for reverse geocoding)
--   - formatted_address: Full formatted address from Google Maps (for display)

ALTER TABLE addresses
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- Add constraints for coordinate validation
-- Latitude must be between -90 and 90
ALTER TABLE addresses
ADD CONSTRAINT chk_latitude_range 
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

-- Longitude must be between -180 and 180
ALTER TABLE addresses
ADD CONSTRAINT chk_longitude_range 
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- If latitude is provided, longitude must also be provided (and vice versa)
ALTER TABLE addresses
ADD CONSTRAINT chk_coordinates_pair 
CHECK (
  (latitude IS NULL AND longitude IS NULL) OR 
  (latitude IS NOT NULL AND longitude IS NOT NULL)
);

-- Add index for location-based queries (useful for finding nearby addresses)
CREATE INDEX IF NOT EXISTS idx_addresses_location 
ON addresses(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add index for place_id lookups
CREATE INDEX IF NOT EXISTS idx_addresses_place_id 
ON addresses(place_id) 
WHERE place_id IS NOT NULL;

-- =====================================================
-- 2. ALTER order_addresses TABLE
-- =====================================================
-- Purpose: Store Google Maps location data in order snapshots
-- This ensures delivery location is preserved even if original address is deleted
-- Same fields as addresses table for consistency

ALTER TABLE order_addresses
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- Add same constraints as addresses table
ALTER TABLE order_addresses
ADD CONSTRAINT chk_order_latitude_range 
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE order_addresses
ADD CONSTRAINT chk_order_longitude_range 
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

ALTER TABLE order_addresses
ADD CONSTRAINT chk_order_coordinates_pair 
CHECK (
  (latitude IS NULL AND longitude IS NULL) OR 
  (latitude IS NOT NULL AND longitude IS NOT NULL)
);

-- Add indexes for order location queries
CREATE INDEX IF NOT EXISTS idx_order_addresses_location 
ON order_addresses(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_addresses_place_id 
ON order_addresses(place_id) 
WHERE place_id IS NOT NULL;

-- =====================================================
-- 3. UPDATE copyToOrderAddress logic (via trigger or application code)
-- =====================================================
-- Note: The copyToOrderAddress function in address.repository.ts 
-- should be updated to copy Google Maps fields when creating order addresses
-- This SQL is for reference - application code handles the copy

-- =====================================================
-- MIGRATION SUMMARY
-- =====================================================
-- Fields Added:
--   - latitude: NUMERIC(10, 8) - GPS latitude (-90 to 90)
--   - longitude: NUMERIC(11, 8) - GPS longitude (-180 to 180)
--   - place_id: TEXT - Google Places API unique identifier
--   - formatted_address: TEXT - Full formatted address from Google
--
-- Why These Fields:
--   1. latitude/longitude: Required for map display, route calculation, 
--      and distance calculations for delivery tracking
--   2. place_id: Enables reverse geocoding, address validation, and 
--      fetching updated address details from Google
--   3. formatted_address: Human-readable full address for display in 
--      admin/rider dashboards and order confirmations
--
-- Constraints:
--   - Coordinates must be valid ranges
--   - Coordinates must be provided as a pair (both or neither)
--   - Indexes added for performance on location queries
--
-- Backward Compatibility:
--   - All new fields are nullable, so existing addresses continue to work
--   - Old addresses without coordinates can still be used
--   - Gradual migration: new addresses will have coordinates, old ones won't
-- =====================================================
