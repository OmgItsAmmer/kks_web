-- ==========================================
-- Collections Schema Update
-- Add premium collection support
-- ==========================================

-- Step 1: Add is_premium column to collections table
ALTER TABLE collections 
ADD COLUMN is_premium BOOLEAN DEFAULT false;

-- Step 2: Create index for premium collections
CREATE INDEX idx_collections_premium ON collections(is_premium);

-- Step 3: Create constraint to ensure only ONE premium collection at a time
-- This uses a partial unique index - only one row can have is_premium = true AND is_active = true
CREATE UNIQUE INDEX idx_collections_single_premium 
ON collections(is_premium) 
WHERE is_premium = true AND is_active = true;

-- Step 4: Update the collections_summary view to include is_premium
DROP VIEW IF EXISTS collections_summary;

CREATE OR REPLACE VIEW collections_summary AS
SELECT 
    c.collection_id,
    c.name,
    c.description,
    c.image_url,
    c.is_active,
    c.is_featured,
    c.is_premium,
    c.display_order,
    c.created_at,
    c.updated_at,
    COUNT(ci.collection_item_id) AS item_count,
    SUM(pv.sell_price * ci.default_quantity) AS total_price
FROM collections c
LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id
LEFT JOIN product_variants pv ON ci.variant_id = pv.variant_id
WHERE c.is_active = true
GROUP BY c.collection_id;

-- Step 5: Set ONE collection as premium (example)
-- First, ensure no collection is premium
UPDATE collections SET is_premium = false WHERE is_premium = true;

-- Then set the first active collection as premium
UPDATE collections 
SET is_premium = true 
WHERE collection_id = (
    SELECT collection_id 
    FROM collections 
    WHERE is_active = true 
    ORDER BY display_order, collection_id 
    LIMIT 1
);

-- Step 6: Verify the changes
SELECT 
    collection_id,
    name,
    is_premium,
    is_featured,
    is_active,
    display_order
FROM collections
ORDER BY is_premium DESC, display_order;

-- ==========================================
-- HELPER QUERIES
-- ==========================================

-- To change which collection is premium:
-- UPDATE collections SET is_premium = false WHERE is_premium = true;
-- UPDATE collections SET is_premium = true WHERE collection_id = [your_collection_id];

-- To get premium collection:
-- SELECT * FROM collections WHERE is_premium = true AND is_active = true LIMIT 1;

-- To get standard collections (not premium):
-- SELECT * FROM collections 
-- WHERE is_active = true AND is_featured = true AND (is_premium = false OR is_premium IS NULL)
-- ORDER BY display_order
-- LIMIT 6;
