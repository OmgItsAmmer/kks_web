export interface Category {
    category_id: number;
    category_name: string;
    description: string | null;
    imageUrl: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CategoryWithProducts extends Category {
    products?: any[];
    totalProducts?: number;
}
