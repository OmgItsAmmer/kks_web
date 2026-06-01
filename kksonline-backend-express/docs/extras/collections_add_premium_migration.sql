-- ==========================================
-- Collections Premium Feature Migration
-- ==========================================
-- Run this if you already have the collections tables
-- This adds the is_premium column to existing collections table

-- Step 1: Add is_premium column
ALTER TABLE collections ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Step 2: Create index for premium collections
CREATE INDEX IF NOT EXISTS idx_collections_premium ON collections(is_premium);

-- Step 3: Set the first collection as premium (you can change this)
UPDATE collections 
SET is_premium = true 
WHERE collection_id = (
    SELECT collection_id 
    FROM collections 
    WHERE is_active = true 
    ORDER BY display_order ASC, created_at ASC 
    LIMIT 1
);

-- Step 4: Ensure all other collections are not premium
UPDATE collections 
SET is_premium = false 
WHERE collection_id NOT IN (
    SELECT collection_id 
    FROM collections 
    WHERE is_premium = true 
    LIMIT 1
);

-- Step 5: Verify the change
SELECT 
    collection_id,
    name,
    is_active,
    is_featured,
    is_premium,
    display_order
FROM collections
ORDER BY is_premium DESC, display_order ASC;

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. Only ONE collection should have is_premium = true
-- 2. The premium collection shows in the main banner
-- 3. Standard collections (is_premium = false) show in side/bottom cards
-- 4. To change which collection is premium:
--    UPDATE collections SET is_premium = false; -- Remove from all
--    UPDATE collections SET is_premium = true WHERE collection_id = X; -- Set new one
