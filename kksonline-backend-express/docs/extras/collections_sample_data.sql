-- ==========================================
-- Collections Module - Sample Data Setup
-- ==========================================
-- This script will populate your collections with actual products from your database
-- Run this AFTER creating the collections schema

-- First, let's see what products/variants are available
-- Run this query first to see available variants:
-- SELECT pv.variant_id, p.product_id, p.name as product_name, pv.variant_name, pv.sell_price, pv.stock
-- FROM product_variants pv
-- JOIN products p ON p.product_id = pv.product_id
-- WHERE p."isVisible" = true AND pv.is_visible = true
-- ORDER BY p.product_id, pv.variant_id
-- LIMIT 20;

-- ==========================================
-- STEP 1: Create Collections
-- ==========================================
-- Delete existing sample collections if they exist
DELETE FROM collections WHERE collection_id IN (1, 2, 3, 4);

-- Reset sequence
SELECT setval('collections_collection_id_seq', 1, false);

-- Insert sample collections
-- First collection is PREMIUM (shows in main banner)
INSERT INTO collections (name, description, image_url, is_featured, is_active, is_premium, display_order) VALUES
('PREMIUM COLLECTION', 'Discover our exclusive premium collection with the finest quality products', '/logo.png', true, true, true, 1);

-- Rest are STANDARD collections (show in side banners and bottom cards)
INSERT INTO collections (name, description, image_url, is_featured, is_active, is_premium, display_order) VALUES
('Essential Bundle', 'Our most popular products bundled together at a great price', '/logo.png', true, true, false, 2),
('Luxury Collection', 'Indulge yourself with our luxury collection', '/logo.png', true, true, false, 3),
('Family Pack', 'Perfect bundle for the whole family', '/logo.png', true, true, false, 4),
('Comfort Collection', 'Maximum comfort for your home', '/logo.png', true, true, false, 5),
('Deluxe Set', 'Premium quality deluxe products', '/logo.png', true, true, false, 6),
('Value Bundle', 'Best value for your money', '/logo.png', true, true, false, 7);

-- ==========================================
-- STEP 2: Automatically Add Items to Collections
-- ==========================================
-- This will find available variants and add them to collections automatically

-- Collection 1: Premium Starter Pack (3 items)
DO $$
DECLARE
    variant_ids INTEGER[];
BEGIN
    -- Get first 3 available variant IDs
    SELECT ARRAY_AGG(pv.variant_id ORDER BY pv.variant_id) INTO variant_ids
    FROM product_variants pv
    JOIN products p ON p.product_id = pv.product_id
    WHERE p."isVisible" = true AND pv.is_visible = true AND pv.stock > 0
    LIMIT 3;

    -- Insert into collection_items if we have variants
    IF array_length(variant_ids, 1) >= 1 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (1, variant_ids[1], 1, 1);
    END IF;
    
    IF array_length(variant_ids, 1) >= 2 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (1, variant_ids[2], 2, 2);
    END IF;
    
    IF array_length(variant_ids, 1) >= 3 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (1, variant_ids[3], 1, 3);
    END IF;
END $$;

-- Collection 2: Essential Bundle (3 items)
DO $$
DECLARE
    variant_ids INTEGER[];
BEGIN
    SELECT ARRAY_AGG(pv.variant_id ORDER BY pv.variant_id) INTO variant_ids
    FROM product_variants pv
    JOIN products p ON p.product_id = pv.product_id
    WHERE p."isVisible" = true AND pv.is_visible = true AND pv.stock > 0
    OFFSET 3 LIMIT 3;

    IF array_length(variant_ids, 1) >= 1 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (2, variant_ids[1], 1, 1);
    END IF;
    
    IF array_length(variant_ids, 1) >= 2 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (2, variant_ids[2], 1, 2);
    END IF;
    
    IF array_length(variant_ids, 1) >= 3 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (2, variant_ids[3], 1, 3);
    END IF;
END $$;

-- Collection 3: Luxury Collection (4 items)
DO $$
DECLARE
    variant_ids INTEGER[];
BEGIN
    SELECT ARRAY_AGG(pv.variant_id ORDER BY pv.variant_id) INTO variant_ids
    FROM product_variants pv
    JOIN products p ON p.product_id = pv.product_id
    WHERE p."isVisible" = true AND pv.is_visible = true AND pv.stock > 0
    OFFSET 6 LIMIT 4;

    IF array_length(variant_ids, 1) >= 1 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (3, variant_ids[1], 2, 1);
    END IF;
    
    IF array_length(variant_ids, 1) >= 2 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (3, variant_ids[2], 1, 2);
    END IF;
    
    IF array_length(variant_ids, 1) >= 3 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (3, variant_ids[3], 1, 3);
    END IF;
    
    IF array_length(variant_ids, 1) >= 4 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (3, variant_ids[4], 3, 4);
    END IF;
END $$;

-- Collection 4: Family Pack (3 items)
DO $$
DECLARE
    variant_ids INTEGER[];
BEGIN
    SELECT ARRAY_AGG(pv.variant_id ORDER BY pv.variant_id) INTO variant_ids
    FROM product_variants pv
    JOIN products p ON p.product_id = pv.product_id
    WHERE p."isVisible" = true AND pv.is_visible = true AND pv.stock > 0
    OFFSET 10 LIMIT 3;

    IF array_length(variant_ids, 1) >= 1 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (4, variant_ids[1], 1, 1);
    END IF;
    
    IF array_length(variant_ids, 1) >= 2 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (4, variant_ids[2], 2, 2);
    END IF;
    
    IF array_length(variant_ids, 1) >= 3 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (4, variant_ids[3], 1, 3);
    END IF;
END $$;

-- Collection 5: Comfort Collection (2 items)
DO $$
DECLARE
    variant_ids INTEGER[];
BEGIN
    SELECT ARRAY_AGG(pv.variant_id ORDER BY pv.variant_id) INTO variant_ids
    FROM product_variants pv
    JOIN products p ON p.product_id = pv.product_id
    WHERE p."isVisible" = true AND pv.is_visible = true AND pv.stock > 0
    OFFSET 13 LIMIT 2;

    IF array_length(variant_ids, 1) >= 1 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (5, variant_ids[1], 1, 1);
    END IF;
    
    IF array_length(variant_ids, 1) >= 2 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (5, variant_ids[2], 2, 2);
    END IF;
END $$;

-- Collection 6: Deluxe Set (3 items)
DO $$
DECLARE
    variant_ids INTEGER[];
BEGIN
    SELECT ARRAY_AGG(pv.variant_id ORDER BY pv.variant_id) INTO variant_ids
    FROM product_variants pv
    JOIN products p ON p.product_id = pv.product_id
    WHERE p."isVisible" = true AND pv.is_visible = true AND pv.stock > 0
    OFFSET 15 LIMIT 3;

    IF array_length(variant_ids, 1) >= 1 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (6, variant_ids[1], 1, 1);
    END IF;
    
    IF array_length(variant_ids, 1) >= 2 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (6, variant_ids[2], 1, 2);
    END IF;
    
    IF array_length(variant_ids, 1) >= 3 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (6, variant_ids[3], 2, 3);
    END IF;
END $$;

-- Collection 7: Value Bundle (4 items)
DO $$
DECLARE
    variant_ids INTEGER[];
BEGIN
    SELECT ARRAY_AGG(pv.variant_id ORDER BY pv.variant_id) INTO variant_ids
    FROM product_variants pv
    JOIN products p ON p.product_id = pv.product_id
    WHERE p."isVisible" = true AND pv.is_visible = true AND pv.stock > 0
    OFFSET 18 LIMIT 4;

    IF array_length(variant_ids, 1) >= 1 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (7, variant_ids[1], 2, 1);
    END IF;
    
    IF array_length(variant_ids, 1) >= 2 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (7, variant_ids[2], 1, 2);
    END IF;
    
    IF array_length(variant_ids, 1) >= 3 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (7, variant_ids[3], 1, 3);
    END IF;
    
    IF array_length(variant_ids, 1) >= 4 THEN
        INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
        VALUES (7, variant_ids[4], 1, 4);
    END IF;
END $$;

-- ==========================================
-- STEP 3: Verify Collections Created
-- ==========================================
-- Run this to see what was created:
SELECT 
    c.collection_id,
    c.name,
    c.is_featured,
    COUNT(ci.collection_item_id) as item_count,
    COALESCE(SUM(pv.sell_price * ci.default_quantity), 0) as total_price
FROM collections c
LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id
LEFT JOIN product_variants pv ON ci.variant_id = pv.variant_id
GROUP BY c.collection_id, c.name, c.is_featured
ORDER BY c.collection_id;

-- ==========================================
-- STEP 4: View Collection Details
-- ==========================================
-- Run this to see the items in each collection:
SELECT 
    c.collection_id,
    c.name as collection_name,
    p.name as product_name,
    pv.variant_name,
    ci.default_quantity,
    pv.sell_price,
    (ci.default_quantity * pv.sell_price) as item_total
FROM collections c
JOIN collection_items ci ON c.collection_id = ci.collection_id
JOIN product_variants pv ON ci.variant_id = pv.variant_id
JOIN products p ON pv.product_id = p.product_id
ORDER BY c.collection_id, ci.sort_order;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
-- If you see collections listed above, the setup was successful!
-- You can now:
-- 1. Refresh your frontend
-- 2. Collections should appear in the hero section
-- 3. Click any collection to see details
-- 4. Test variant selection and quantity controls
-- 5. Try adding to cart

-- ==========================================
-- TROUBLESHOOTING
-- ==========================================
-- If collections are empty (0 items), it means no products were found.
-- Run this query to check if you have products:
-- SELECT COUNT(*) FROM products WHERE "isVisible" = true;
-- SELECT COUNT(*) FROM product_variants WHERE is_visible = true AND stock > 0;

-- If you have products but collections are still empty, manually add items:
-- INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order)
-- VALUES (1, [your_variant_id], 1, 1);
