-- Check which collections have images in the image_entity table
SELECT 
    c.collection_id,
    c.name,
    c.image_url as collection_table_image_url,
    ie.image_entity_id,
    ie.entity_category,
    ie."isFeatured",
    i.filename,
    i.folderType,
    i.image_url as images_table_url
FROM collections c
LEFT JOIN image_entity ie ON ie.entity_id = c.collection_id AND ie.entity_category = 'collections'
LEFT JOIN images i ON ie.image_id = i.image_id
WHERE c.is_active = true
ORDER BY c.collection_id;

-- Count collections with and without images
SELECT 
    COUNT(*) FILTER (WHERE ie.image_entity_id IS NOT NULL) as collections_with_images,
    COUNT(*) FILTER (WHERE ie.image_entity_id IS NULL) as collections_without_images,
    COUNT(*) as total_collections
FROM collections c
LEFT JOIN image_entity ie ON ie.entity_id = c.collection_id AND ie.entity_category = 'collections'
WHERE c.is_active = true;
