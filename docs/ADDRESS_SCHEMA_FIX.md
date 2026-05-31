# Address Schema Fix - Remove Empty String Constraints

## Problem

Backend rejects addresses when optional fields (city, postal_code, shipping_address) are empty strings. The database has check constraints that don't allow empty or whitespace-only text fields.

With Google Maps integration, when users click on the map without geocoding completing, these fields may be empty, causing "Invalid address data: text fields must not be empty or contain only whitespace" errors.

## Solution

Remove the check constraints that reject empty strings, since these fields are already nullable and optional.

## SQL Migration

Run this SQL to remove the problematic constraints:

```sql
-- =====================================================
-- Fix Address Schema - Allow Empty Optional Fields
-- =====================================================

-- Remove check constraints that reject empty strings
-- These constraints are too strict for optional fields

-- For addresses table
DO $$ 
BEGIN
    -- Try to drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_valid_text_fields' 
        AND conrelid = 'addresses'::regclass
    ) THEN
        ALTER TABLE addresses DROP CONSTRAINT chk_valid_text_fields;
        RAISE NOTICE 'Dropped chk_valid_text_fields constraint from addresses';
    END IF;
END $$;

-- For order_addresses table
DO $$ 
BEGIN
    -- Try to drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_valid_text_fields' 
        AND conrelid = 'order_addresses'::regclass
    ) THEN
        ALTER TABLE order_addresses DROP CONSTRAINT chk_valid_text_fields;
        RAISE NOTICE 'Dropped chk_valid_text_fields constraint from order_addresses';
    END IF;
END $$;

-- =====================================================
-- Optional: Add more lenient constraints if needed
-- =====================================================

-- Only full_name and phone_number are truly required
-- Others (shipping_address, city, postal_code) can be NULL or empty
-- because we have latitude/longitude for precise location

-- Add constraint to ensure full_name is not empty
ALTER TABLE addresses
ADD CONSTRAINT chk_full_name_not_empty 
CHECK (full_name IS NOT NULL AND trim(full_name) != '');

ALTER TABLE order_addresses
ADD CONSTRAINT chk_full_name_not_empty 
CHECK (full_name IS NOT NULL AND trim(full_name) != '');

-- Add constraint to ensure phone_number is not empty
ALTER TABLE addresses
ADD CONSTRAINT chk_phone_not_empty 
CHECK (phone_number IS NOT NULL AND trim(phone_number) != '');

ALTER TABLE order_addresses
ADD CONSTRAINT chk_phone_not_empty 
CHECK (phone_number IS NOT NULL AND trim(phone_number) != '');

-- =====================================================
-- Explanation
-- =====================================================

-- Why remove the strict constraint?
-- 1. With Google Maps, we have latitude/longitude for precise location
-- 2. Address components (city, postal_code) may not be available immediately
-- 3. Users clicking on map before geocoding completes should still work
-- 4. These fields are already nullable in the schema
-- 5. Only full_name and phone_number are truly required for delivery

-- The new approach:
-- - Required: full_name, phone_number, latitude, longitude
-- - Optional: shipping_address, city, postal_code
-- - Location is precise via GPS coordinates
-- - Text address is supplementary information
```

## Verification

After running the migration, verify the constraints:

```sql
-- Check current constraints on addresses table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'addresses'::regclass;

-- Check current constraints on order_addresses table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'order_addresses'::regclass;
```

## Testing

After migration, test these scenarios:

1. **Click map without geocoding** - Should work
2. **Use current location** - Should work with full address
3. **Manual map selection** - Should work even without city/postal_code

## Rollback (if needed)

If you need to restore the original constraint:

```sql
-- Restore strict constraint (NOT recommended with Google Maps)
ALTER TABLE addresses
ADD CONSTRAINT chk_valid_text_fields
CHECK (
    (shipping_address IS NULL OR trim(shipping_address) != '') AND
    (city IS NULL OR trim(city) != '') AND
    (postal_code IS NULL OR trim(postal_code) != '')
);

ALTER TABLE order_addresses
ADD CONSTRAINT chk_valid_text_fields
CHECK (
    (shipping_address IS NULL OR trim(shipping_address) != '') AND
    (city IS NULL OR trim(city) != '') AND
    (postal_code IS NULL OR trim(postal_code) != '')
);
```

## Summary

- ✅ Removed overly strict constraints on optional fields
- ✅ Keep constraints on required fields (full_name, phone_number)
- ✅ Allow empty optional fields since we have GPS coordinates
- ✅ Frontend and backend now handle missing address components properly
