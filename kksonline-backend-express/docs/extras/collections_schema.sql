-- Collections Feature Database Schema
-- Run this SQL to create the necessary tables for the Collections module

-- ==========================================
-- 1. COLLECTIONS TABLE
-- ==========================================
-- Stores collection information (bundles of products)
CREATE TABLE collections (
    collection_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for active and featured collections
CREATE INDEX idx_collections_active ON collections(is_active);
CREATE INDEX idx_collections_featured ON collections(is_featured);
CREATE INDEX idx_collections_display_order ON collections(display_order);

-- ==========================================
-- 2. COLLECTION_ITEMS TABLE
-- ==========================================
-- Stores products/variants included in each collection
CREATE TABLE collection_items (
    collection_item_id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(collection_id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(variant_id) ON DELETE CASCADE,
    default_quantity INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_default_quantity CHECK (default_quantity > 0)
);

-- Indexes for efficient querying
CREATE INDEX idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX idx_collection_items_variant_id ON collection_items(variant_id);
CREATE UNIQUE INDEX idx_collection_items_unique ON collection_items(collection_id, variant_id);

-- ==========================================
-- 3. COLLECTION_CART TABLE
-- ==========================================
-- Stores collections added to cart with customized quantities
CREATE TABLE collection_cart (
    collection_cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    collection_id INTEGER NOT NULL REFERENCES collections(collection_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for customer cart lookups
CREATE INDEX idx_collection_cart_customer ON collection_cart(customer_id);
CREATE INDEX idx_collection_cart_collection ON collection_cart(collection_id);

-- ==========================================
-- 4. COLLECTION_CART_ITEMS TABLE
-- ==========================================
-- Stores individual items within a collection cart entry
CREATE TABLE collection_cart_items (
    collection_cart_item_id SERIAL PRIMARY KEY,
    collection_cart_id INTEGER NOT NULL REFERENCES collection_cart(collection_cart_id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(variant_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_quantity CHECK (quantity > 0)
);

-- Indexes for efficient querying
CREATE INDEX idx_collection_cart_items_cart_id ON collection_cart_items(collection_cart_id);
CREATE INDEX idx_collection_cart_items_variant_id ON collection_cart_items(variant_id);
CREATE UNIQUE INDEX idx_collection_cart_items_unique ON collection_cart_items(collection_cart_id, variant_id);

-- ==========================================
-- 5. VIEWS FOR EASY DATA RETRIEVAL
-- ==========================================

-- View: Collection with item count and total price range
CREATE OR REPLACE VIEW collections_summary AS
SELECT 
    c.collection_id,
    c.name,
    c.description,
    c.image_url,
    c.is_active,
    c.is_featured,
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

-- View: Collection items with product details
CREATE OR REPLACE VIEW collection_items_detail AS
SELECT 
    ci.collection_item_id,
    ci.collection_id,
    ci.variant_id,
    ci.default_quantity,
    ci.sort_order,
    p.product_id,
    p.name AS product_name,
    p.description AS product_description,
    pv.variant_name,
    pv.sell_price,
    pv.stock,
    pv.is_visible,
    pv.sku,
    (SELECT ie.image_id 
     FROM image_entity ie 
     WHERE ie.entity_id = p.product_id 
     AND ie.entity_category = 'products' 
     AND ie."isFeatured" = true 
     LIMIT 1) AS featured_image_id,
    (SELECT i.image_url 
     FROM images i 
     INNER JOIN image_entity ie ON i.image_id = ie.image_id
     WHERE ie.entity_id = p.product_id 
     AND ie.entity_category = 'products' 
     AND ie."isFeatured" = true 
     LIMIT 1) AS image_url
FROM collection_items ci
INNER JOIN product_variants pv ON ci.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
WHERE pv.is_visible = true;

-- ==========================================
-- 6. FUNCTIONS
-- ==========================================

-- Function to update collection updated_at timestamp
CREATE OR REPLACE FUNCTION update_collection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for collections table
CREATE TRIGGER trigger_update_collection_timestamp
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_timestamp();

-- Trigger for collection_cart table
CREATE TRIGGER trigger_update_collection_cart_timestamp
    BEFORE UPDATE ON collection_cart
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_timestamp();

-- ==========================================
-- 7. SAMPLE DATA (Optional - for testing)
-- ==========================================

-- Insert sample collections
INSERT INTO collections (name, description, image_url, is_featured, display_order) VALUES
('Premium Starter Pack', 'Everything you need to get started with our premium products', '/collections/premium-starter.jpg', true, 1),
('Essential Bundle', 'Our most popular products bundled together at a great price', '/collections/essential-bundle.jpg', true, 2),
('Luxury Collection', 'Indulge yourself with our luxury collection', '/collections/luxury-collection.jpg', true, 3),
('Family Pack', 'Perfect bundle for the whole family', '/collections/family-pack.jpg', false, 4);

-- Note: You'll need to insert collection_items manually based on your actual variant_ids
-- Example structure:
-- INSERT INTO collection_items (collection_id, variant_id, default_quantity, sort_order) VALUES
-- (1, [your_variant_id], 1, 1),
-- (1, [your_variant_id], 2, 2);

-- ==========================================
-- 8. PERMISSIONS (Adjust based on your security setup)
-- ==========================================

-- Grant SELECT permissions to authenticated users
-- ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE collection_cart ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE collection_cart_items ENABLE ROW LEVEL SECURITY;

-- Create policies based on your security requirements
-- Example:
-- CREATE POLICY "Public can view active collections" ON collections
--     FOR SELECT USING (is_active = true);

-- CREATE POLICY "Customers can manage their own collection cart" ON collection_cart
--     FOR ALL USING (auth.uid() IN (SELECT auth_uid FROM customers WHERE customer_id = collection_cart.customer_id));

COMMENT ON TABLE collections IS 'Stores product collections/bundles';
COMMENT ON TABLE collection_items IS 'Links products/variants to collections with default quantities';
COMMENT ON TABLE collection_cart IS 'Stores collections added to customer cart';
COMMENT ON TABLE collection_cart_items IS 'Stores customized items within a collection cart entry';
