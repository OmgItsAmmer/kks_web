export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type Gender = 'male' | 'female' | 'other';
export type ProductTag = 'CHOICE' | 'RECOMMENDED' | 'TRENDING' | 'hotSeller' | 'flashSale' | 'newArrival' | 'AUTHENTIC';
export type OrderStatus = 'pending' | 'ready' | 'confirmed' | 'cancelled' | 'delivered' | 'processing' | 'completed';
export type PaymentMethod = 'cod' | 'credit_card' | 'bank_transfer' | 'pickup' | 'jazzcash';
export type DiscountType = 'percentage' | 'fixed';
export type EntityType = 'customer' | 'vendor' | 'salesman';
export type TransactionType = 'buy' | 'sell';
export type PurchaseStatus = 'pending' | 'processing' | 'received' | 'cancelled';
export type SeverityLevel = 'info' | 'warning' | 'error' | 'critical';
export interface Database {
    graphql_public: {
        Tables: Record<string, never>;
        Views: Record<string, never>;
        Functions: {
            graphql: {
                Args: {
                    operationName?: string;
                    query?: string;
                    variables?: Json;
                    extensions?: Json;
                };
                Returns: Json;
            };
        };
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
    public: {
        Tables: {
            customers: {
                Row: {
                    customer_id: number;
                    phone_number: string | null;
                    first_name: string;
                    last_name: string | null;
                    cnic: string | null;
                    email: string;
                    created_at: string | null;
                    dob: string | null;
                    gender: Gender | null;
                    auth_uid: string | null;
                    fcm_token: string | null;
                };
                Insert: {
                    customer_id?: number;
                    phone_number?: string | null;
                    first_name: string;
                    last_name?: string | null;
                    cnic?: string | null;
                    email: string;
                    created_at?: string | null;
                    dob?: string | null;
                    gender?: Gender | null;
                    auth_uid?: string | null;
                    fcm_token?: string | null;
                };
                Update: {
                    customer_id?: number;
                    phone_number?: string | null;
                    first_name?: string;
                    last_name?: string | null;
                    cnic?: string | null;
                    email?: string;
                    created_at?: string | null;
                    dob?: string | null;
                    gender?: Gender | null;
                    auth_uid?: string | null;
                    fcm_token?: string | null;
                };
                Relationships: [];
            };
            products: {
                Row: {
                    product_id: number;
                    name: string;
                    description: string | null;
                    base_price: string | null;
                    sale_price: string | null;
                    category_id: number | null;
                    ispopular: boolean | null;
                    stock_quantity: number | null;
                    created_at: string | null;
                    brandID: number | null;
                    alert_stock: number | null;
                    isVisible: boolean | null;
                    tag: ProductTag | null;
                    price_range: string | null;
                };
                Insert: {
                    product_id?: number;
                    name: string;
                    description?: string | null;
                    base_price?: string | null;
                    sale_price?: string | null;
                    category_id?: number | null;
                    ispopular?: boolean | null;
                    stock_quantity?: number | null;
                    created_at?: string | null;
                    brandID?: number | null;
                    alert_stock?: number | null;
                    isVisible?: boolean | null;
                    tag?: ProductTag | null;
                    price_range?: string | null;
                };
                Update: {
                    product_id?: number;
                    name?: string;
                    description?: string | null;
                    base_price?: string | null;
                    sale_price?: string | null;
                    category_id?: number | null;
                    ispopular?: boolean | null;
                    stock_quantity?: number | null;
                    created_at?: string | null;
                    brandID?: number | null;
                    alert_stock?: number | null;
                    isVisible?: boolean | null;
                    tag?: ProductTag | null;
                    price_range?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "products_category_id_fkey";
                        columns: ["category_id"];
                        isOneToOne: false;
                        referencedRelation: "categories";
                        referencedColumns: ["category_id"];
                    },
                    {
                        foreignKeyName: "products_brandID_fkey";
                        columns: ["brandID"];
                        isOneToOne: false;
                        referencedRelation: "brands";
                        referencedColumns: ["brandID"];
                    }
                ];
            };
            product_variants: {
                Row: {
                    variant_id: number;
                    product_id: number;
                    buy_price: number;
                    sell_price: number;
                    created_at: string | null;
                    updated_at: string | null;
                    sku: string | null;
                    variant_name: string;
                    is_visible: boolean | null;
                    stock: number | null;
                    alert_stock: number;
                };
                Insert: {
                    variant_id?: number;
                    product_id: number;
                    buy_price: number;
                    sell_price: number;
                    created_at?: string | null;
                    updated_at?: string | null;
                    sku?: string | null;
                    variant_name: string;
                    is_visible?: boolean | null;
                    stock?: number | null;
                    alert_stock?: number;
                };
                Update: {
                    variant_id?: number;
                    product_id?: number;
                    buy_price?: number;
                    sell_price?: number;
                    created_at?: string | null;
                    updated_at?: string | null;
                    sku?: string | null;
                    variant_name?: string;
                    is_visible?: boolean | null;
                    stock?: number | null;
                    alert_stock?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "product_variants_product_id_fkey";
                        columns: ["product_id"];
                        isOneToOne: false;
                        referencedRelation: "products";
                        referencedColumns: ["product_id"];
                    }
                ];
            };
            categories: {
                Row: {
                    category_id: number;
                    category_name: string;
                    isFeatured: boolean | null;
                    created_at: string | null;
                    product_count: number | null;
                };
                Insert: {
                    category_id?: number;
                    category_name: string;
                    isFeatured?: boolean | null;
                    created_at?: string | null;
                    product_count?: number | null;
                };
                Update: {
                    category_id?: number;
                    category_name?: string;
                    isFeatured?: boolean | null;
                    created_at?: string | null;
                    product_count?: number | null;
                };
                Relationships: [];
            };
            brands: {
                Row: {
                    brandID: number;
                    brandname: string | null;
                    isVerified: boolean | null;
                    isFeatured: boolean | null;
                    product_count: number;
                };
                Insert: {
                    brandID?: number;
                    brandname?: string | null;
                    isVerified?: boolean | null;
                    isFeatured?: boolean | null;
                    product_count?: number;
                };
                Update: {
                    brandID?: number;
                    brandname?: string | null;
                    isVerified?: boolean | null;
                    isFeatured?: boolean | null;
                    product_count?: number;
                };
                Relationships: [];
            };
            cart: {
                Row: {
                    cart_id: number;
                    variant_id: number | null;
                    quantity: string;
                    customer_id: number | null;
                };
                Insert: {
                    cart_id?: number;
                    variant_id?: number | null;
                    quantity: string;
                    customer_id?: number | null;
                };
                Update: {
                    cart_id?: number;
                    variant_id?: number | null;
                    quantity?: string;
                    customer_id?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "cart_customer_id_fkey";
                        columns: ["customer_id"];
                        isOneToOne: false;
                        referencedRelation: "customers";
                        referencedColumns: ["customer_id"];
                    },
                    {
                        foreignKeyName: "cart_variant_id_fkey";
                        columns: ["variant_id"];
                        isOneToOne: false;
                        referencedRelation: "product_variants";
                        referencedColumns: ["variant_id"];
                    }
                ];
            };
            orders: {
                Row: {
                    order_id: number;
                    order_date: string;
                    sub_total: number;
                    status: OrderStatus;
                    saletype: string | null;
                    address_id: number | null;
                    paid_amount: number | null;
                    buying_price: number | null;
                    discount: number | null;
                    tax: number | null;
                    shipping_fee: number | null;
                    user_id: number | null;
                    customer_id: number | null;
                    idempotency_key: string | null;
                    payment_method: PaymentMethod | null;
                    salesman_id: number | null;
                    salesman_comission: number | null;
                    shipping_method: string | null;
                };
                Insert: {
                    order_id?: number;
                    order_date: string;
                    sub_total: number;
                    status: OrderStatus;
                    saletype?: string | null;
                    address_id?: number | null;
                    paid_amount?: number | null;
                    buying_price?: number | null;
                    discount?: number | null;
                    tax?: number | null;
                    shipping_fee?: number | null;
                    user_id?: number | null;
                    customer_id?: number | null;
                    idempotency_key?: string | null;
                    payment_method?: PaymentMethod | null;
                    salesman_id?: number | null;
                    salesman_comission?: number | null;
                    shipping_method?: string | null;
                };
                Update: {
                    order_id?: number;
                    order_date?: string;
                    sub_total?: number;
                    status?: OrderStatus;
                    saletype?: string | null;
                    address_id?: number | null;
                    paid_amount?: number | null;
                    buying_price?: number | null;
                    discount?: number | null;
                    tax?: number | null;
                    shipping_fee?: number | null;
                    user_id?: number | null;
                    customer_id?: number | null;
                    idempotency_key?: string | null;
                    payment_method?: PaymentMethod | null;
                    salesman_id?: number | null;
                    salesman_comission?: number | null;
                    shipping_method?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "orders_address_id_fkey";
                        columns: ["address_id"];
                        isOneToOne: false;
                        referencedRelation: "addresses";
                        referencedColumns: ["address_id"];
                    },
                    {
                        foreignKeyName: "orders_customer_id_fkey";
                        columns: ["customer_id"];
                        isOneToOne: false;
                        referencedRelation: "customers";
                        referencedColumns: ["customer_id"];
                    }
                ];
            };
            order_items: {
                Row: {
                    product_id: number;
                    price: number;
                    quantity: number;
                    order_id: number;
                    unit: string | null;
                    total_buy_price: number | null;
                    created_at: string | null;
                    variant_id: number;
                };
                Insert: {
                    product_id: number;
                    price: number;
                    quantity: number;
                    order_id: number;
                    unit?: string | null;
                    total_buy_price?: number | null;
                    created_at?: string | null;
                    variant_id: number;
                };
                Update: {
                    product_id?: number;
                    price?: number;
                    quantity?: number;
                    order_id?: number;
                    unit?: string | null;
                    total_buy_price?: number | null;
                    created_at?: string | null;
                    variant_id?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "order_items_order_id_fkey";
                        columns: ["order_id"];
                        isOneToOne: false;
                        referencedRelation: "orders";
                        referencedColumns: ["order_id"];
                    },
                    {
                        foreignKeyName: "order_items_product_id_fkey";
                        columns: ["product_id"];
                        isOneToOne: false;
                        referencedRelation: "products";
                        referencedColumns: ["product_id"];
                    },
                    {
                        foreignKeyName: "order_items_variant_id_fkey";
                        columns: ["variant_id"];
                        isOneToOne: false;
                        referencedRelation: "product_variants";
                        referencedColumns: ["variant_id"];
                    }
                ];
            };
            addresses: {
                Row: {
                    address_id: number;
                    shipping_address: string | null;
                    phone_number: string | null;
                    postal_code: string | null;
                    city: string | null;
                    country: string | null;
                    full_name: string;
                    customer_id: number | null;
                    vendor_id: number | null;
                    salesman_id: number | null;
                    user_id: number | null;
                };
                Insert: {
                    address_id?: number;
                    shipping_address?: string | null;
                    phone_number?: string | null;
                    postal_code?: string | null;
                    city?: string | null;
                    country?: string | null;
                    full_name: string;
                    customer_id?: number | null;
                    vendor_id?: number | null;
                    salesman_id?: number | null;
                    user_id?: number | null;
                };
                Update: {
                    address_id?: number;
                    shipping_address?: string | null;
                    phone_number?: string | null;
                    postal_code?: string | null;
                    city?: string | null;
                    country?: string | null;
                    full_name?: string;
                    customer_id?: number | null;
                    vendor_id?: number | null;
                    salesman_id?: number | null;
                    user_id?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "addresses_customer_id_fkey";
                        columns: ["customer_id"];
                        isOneToOne: false;
                        referencedRelation: "customers";
                        referencedColumns: ["customer_id"];
                    }
                ];
            };
            order_addresses: {
                Row: {
                    order_address_id: number;
                    shipping_address: string | null;
                    phone_number: string | null;
                    postal_code: string | null;
                    city: string | null;
                    country: string | null;
                    full_name: string;
                    customer_id: number | null;
                    vendor_id: number | null;
                    salesman_id: number | null;
                    user_id: number | null;
                    address_id: number | null;
                };
                Insert: {
                    order_address_id?: number;
                    shipping_address?: string | null;
                    phone_number?: string | null;
                    postal_code?: string | null;
                    city?: string | null;
                    country?: string | null;
                    full_name: string;
                    customer_id?: number | null;
                    vendor_id?: number | null;
                    salesman_id?: number | null;
                    user_id?: number | null;
                    address_id?: number | null;
                };
                Update: {
                    order_address_id?: number;
                    shipping_address?: string | null;
                    phone_number?: string | null;
                    postal_code?: string | null;
                    city?: string | null;
                    country?: string | null;
                    full_name?: string;
                    customer_id?: number | null;
                    vendor_id?: number | null;
                    salesman_id?: number | null;
                    user_id?: number | null;
                    address_id?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "order_addresses_address_id_fkey";
                        columns: ["address_id"];
                        isOneToOne: false;
                        referencedRelation: "addresses";
                        referencedColumns: ["address_id"];
                    }
                ];
            };
            wishlist: {
                Row: {
                    wishlist_id: number;
                    created_at: string;
                    product_id: number | null;
                    customer_id: number | null;
                };
                Insert: {
                    wishlist_id?: number;
                    created_at?: string;
                    product_id?: number | null;
                    customer_id?: number | null;
                };
                Update: {
                    wishlist_id?: number;
                    created_at?: string;
                    product_id?: number | null;
                    customer_id?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "wishlist_customer_id_fkey";
                        columns: ["customer_id"];
                        isOneToOne: false;
                        referencedRelation: "customers";
                        referencedColumns: ["customer_id"];
                    },
                    {
                        foreignKeyName: "wishlist_product_id_fkey";
                        columns: ["product_id"];
                        isOneToOne: false;
                        referencedRelation: "products";
                        referencedColumns: ["product_id"];
                    }
                ];
            };
            reviews: {
                Row: {
                    review_id: number;
                    product_id: number | null;
                    sent_at: string;
                    review: string | null;
                    rating: number | null;
                    customer_id: number | null;
                };
                Insert: {
                    review_id?: number;
                    product_id?: number | null;
                    sent_at?: string;
                    review?: string | null;
                    rating?: number | null;
                    customer_id?: number | null;
                };
                Update: {
                    review_id?: number;
                    product_id?: number | null;
                    sent_at?: string;
                    review?: string | null;
                    rating?: number | null;
                    customer_id?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "reviews_customer_id_fkey";
                        columns: ["customer_id"];
                        isOneToOne: false;
                        referencedRelation: "customers";
                        referencedColumns: ["customer_id"];
                    },
                    {
                        foreignKeyName: "reviews_product_id_fkey";
                        columns: ["product_id"];
                        isOneToOne: false;
                        referencedRelation: "products";
                        referencedColumns: ["product_id"];
                    }
                ];
            };
            shop: {
                Row: {
                    shop_id: number;
                    shopname: string;
                    taxrate: number;
                    shipping_price: number;
                    threshold_free_shipping: number | null;
                    software_company_name: string | null;
                    software_website_link: string | null;
                    software_contact_no: string | null;
                    is_shipping_enable: boolean;
                    max_allowed_item_quantity: number;
                };
                Insert: {
                    shop_id?: number;
                    shopname: string;
                    taxrate: number;
                    shipping_price: number;
                    threshold_free_shipping?: number | null;
                    software_company_name?: string | null;
                    software_website_link?: string | null;
                    software_contact_no?: string | null;
                    is_shipping_enable?: boolean;
                    max_allowed_item_quantity?: number;
                };
                Update: {
                    shop_id?: number;
                    shopname?: string;
                    taxrate?: number;
                    shipping_price?: number;
                    threshold_free_shipping?: number | null;
                    software_company_name?: string | null;
                    software_website_link?: string | null;
                    software_contact_no?: string | null;
                    is_shipping_enable?: boolean;
                    max_allowed_item_quantity?: number;
                };
                Relationships: [];
            };
            app_versions: {
                Row: {
                    id: number;
                    version: string;
                    force_update: boolean;
                    redirect_url: string;
                    description: string | null;
                    created_at: string | null;
                    app_locked: boolean;
                };
                Insert: {
                    id?: number;
                    version: string;
                    force_update?: boolean;
                    redirect_url: string;
                    description?: string | null;
                    created_at?: string | null;
                    app_locked?: boolean;
                };
                Update: {
                    id?: number;
                    version?: string;
                    force_update?: boolean;
                    redirect_url?: string;
                    description?: string | null;
                    created_at?: string | null;
                    app_locked?: boolean;
                };
                Relationships: [];
            };
            images: {
                Row: {
                    image_id: number;
                    filename: string | null;
                    created_at: string | null;
                    image_url: string | null;
                    folderType: string | null;
                };
                Insert: {
                    image_id?: number;
                    filename?: string | null;
                    created_at?: string | null;
                    image_url?: string | null;
                    folderType?: string | null;
                };
                Update: {
                    image_id?: number;
                    filename?: string | null;
                    created_at?: string | null;
                    image_url?: string | null;
                    folderType?: string | null;
                };
                Relationships: [];
            };
            image_entity: {
                Row: {
                    image_entity_id: number;
                    image_id: number | null;
                    entity_id: number | null;
                    entity_category: string | null;
                    created_at: string;
                    isFeatured: boolean | null;
                    updated_at: string | null;
                };
                Insert: {
                    image_entity_id?: number;
                    image_id?: number | null;
                    entity_id?: number | null;
                    entity_category?: string | null;
                    created_at?: string;
                    isFeatured?: boolean | null;
                    updated_at?: string | null;
                };
                Update: {
                    image_entity_id?: number;
                    image_id?: number | null;
                    entity_id?: number | null;
                    entity_category?: string | null;
                    created_at?: string;
                    isFeatured?: boolean | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "image_entity_image_id_fkey";
                        columns: ["image_id"];
                        isOneToOne: false;
                        referencedRelation: "images";
                        referencedColumns: ["image_id"];
                    }
                ];
            };
            users: {
                Row: {
                    user_id: number;
                    first_name: string;
                    last_name: string | null;
                    phone_number: string | null;
                    email: string;
                    dob: string | null;
                    created_at: string | null;
                    gender: Gender | null;
                    auth_uid: string | null;
                };
                Insert: {
                    user_id?: number;
                    first_name: string;
                    last_name?: string | null;
                    phone_number?: string | null;
                    email: string;
                    dob?: string | null;
                    created_at?: string | null;
                    gender?: Gender | null;
                    auth_uid?: string | null;
                };
                Update: {
                    user_id?: number;
                    first_name?: string;
                    last_name?: string | null;
                    phone_number?: string | null;
                    email?: string;
                    dob?: string | null;
                    created_at?: string | null;
                    gender?: Gender | null;
                    auth_uid?: string | null;
                };
                Relationships: [];
            };
            vendors: {
                Row: {
                    vendor_id: number;
                    phone_number: string | null;
                    first_name: string;
                    last_name: string | null;
                    cnic: string;
                    email: string;
                    created_at: string | null;
                };
                Insert: {
                    vendor_id?: number;
                    phone_number?: string | null;
                    first_name: string;
                    last_name?: string | null;
                    cnic: string;
                    email: string;
                    created_at?: string | null;
                };
                Update: {
                    vendor_id?: number;
                    phone_number?: string | null;
                    first_name?: string;
                    last_name?: string | null;
                    cnic?: string;
                    email?: string;
                    created_at?: string | null;
                };
                Relationships: [];
            };
            product_discounts: {
                Row: {
                    discount_id: number;
                    product_id: number;
                    discount_type: DiscountType;
                    amount: number;
                    start_date: string;
                    end_date: string;
                    is_active: boolean;
                    created_at: string;
                };
                Insert: {
                    discount_id?: number;
                    product_id: number;
                    discount_type: DiscountType;
                    amount: number;
                    start_date: string;
                    end_date: string;
                    is_active?: boolean;
                    created_at?: string;
                };
                Update: {
                    discount_id?: number;
                    product_id?: number;
                    discount_type?: DiscountType;
                    amount?: number;
                    start_date?: string;
                    end_date?: string;
                    is_active?: boolean;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "product_discounts_product_id_fkey";
                        columns: ["product_id"];
                        isOneToOne: false;
                        referencedRelation: "products";
                        referencedColumns: ["product_id"];
                    }
                ];
            };
            invoice_coupons: {
                Row: {
                    coupon_id: number;
                    title: string;
                    coupon_code: string;
                    discount_type: DiscountType;
                    amount: number;
                    usage_limit: number | null;
                    used_count: number;
                    start_date: string;
                    end_date: string;
                    is_active: boolean;
                    created_at: string;
                };
                Insert: {
                    coupon_id?: number;
                    title: string;
                    coupon_code: string;
                    discount_type: DiscountType;
                    amount: number;
                    usage_limit?: number | null;
                    used_count?: number;
                    start_date: string;
                    end_date: string;
                    is_active?: boolean;
                    created_at?: string;
                };
                Update: {
                    coupon_id?: number;
                    title?: string;
                    coupon_code?: string;
                    discount_type?: DiscountType;
                    amount?: number;
                    usage_limit?: number | null;
                    used_count?: number;
                    start_date?: string;
                    end_date?: string;
                    is_active?: boolean;
                    created_at?: string;
                };
                Relationships: [];
            };
            notifications: {
                Row: {
                    notification_id: number;
                    created_at: string;
                    description: string | null;
                    sub_description: string | null;
                    isRead: boolean | null;
                    NotificationType: string | null;
                    expires_at: string | null;
                    order_id: number | null;
                    installment_plan_id: number | null;
                    product_id: number | null;
                };
                Insert: {
                    notification_id?: number;
                    created_at?: string;
                    description?: string | null;
                    sub_description?: string | null;
                    isRead?: boolean | null;
                    NotificationType?: string | null;
                    expires_at?: string | null;
                    order_id?: number | null;
                    installment_plan_id?: number | null;
                    product_id?: number | null;
                };
                Update: {
                    notification_id?: number;
                    created_at?: string;
                    description?: string | null;
                    sub_description?: string | null;
                    isRead?: boolean | null;
                    NotificationType?: string | null;
                    expires_at?: string | null;
                    order_id?: number | null;
                    installment_plan_id?: number | null;
                    product_id?: number | null;
                };
                Relationships: [];
            };
            security_audit_log: {
                Row: {
                    log_id: number;
                    event_type: string;
                    event_data: Json | null;
                    timestamp: string | null;
                    ip_address: string | null;
                    user_agent: string | null;
                    customer_id: number | null;
                    severity: SeverityLevel | null;
                };
                Insert: {
                    log_id?: number;
                    event_type: string;
                    event_data?: Json | null;
                    timestamp?: string | null;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    customer_id?: number | null;
                    severity?: SeverityLevel | null;
                };
                Update: {
                    log_id?: number;
                    event_type?: string;
                    event_data?: Json | null;
                    timestamp?: string | null;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    customer_id?: number | null;
                    severity?: SeverityLevel | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "security_audit_log_customer_id_fkey";
                        columns: ["customer_id"];
                        isOneToOne: false;
                        referencedRelation: "customers";
                        referencedColumns: ["customer_id"];
                    }
                ];
            };
            inventory_reservations: {
                Row: {
                    reservation_id: string;
                    variant_id: number;
                    quantity: number;
                    expires_at: string;
                    created_at: string | null;
                };
                Insert: {
                    reservation_id: string;
                    variant_id: number;
                    quantity: number;
                    expires_at: string;
                    created_at?: string | null;
                };
                Update: {
                    reservation_id?: string;
                    variant_id?: number;
                    quantity?: number;
                    expires_at?: string;
                    created_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "inventory_reservations_variant_id_fkey";
                        columns: ["variant_id"];
                        isOneToOne: false;
                        referencedRelation: "product_variants";
                        referencedColumns: ["variant_id"];
                    }
                ];
            };
            kiosk_cart: {
                Row: {
                    kiosk_id: number;
                    kiosk_session_id: string;
                    variant_id: number;
                    quantity: number;
                    created_at: string | null;
                };
                Insert: {
                    kiosk_id?: number;
                    kiosk_session_id: string;
                    variant_id: number;
                    quantity: number;
                    created_at?: string | null;
                };
                Update: {
                    kiosk_id?: number;
                    kiosk_session_id?: string;
                    variant_id?: number;
                    quantity?: number;
                    created_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "kiosk_cart_variant_id_fkey";
                        columns: ["variant_id"];
                        isOneToOne: false;
                        referencedRelation: "product_variants";
                        referencedColumns: ["variant_id"];
                    }
                ];
            };
        };
        Views: Record<string, never>;
        Functions: {
            copy_address_to_order_address: {
                Args: {
                    p_address_id: number;
                };
                Returns: number;
            };
            reserve_inventory_secure: {
                Args: {
                    p_reservation_id: string;
                    p_cart_items: Json;
                };
                Returns: Json;
            };
            confirm_inventory_reservation: {
                Args: {
                    p_reservation_id: string;
                };
                Returns: undefined;
            };
            check_stock: {
                Args: {
                    p_variant_id_input: number;
                    p_new_quantity_input: number;
                };
                Returns: boolean;
            };
            add_to_cart_validation: {
                Args: {
                    p_variant_id_input: number;
                    p_new_quantity_input: number;
                };
                Returns: boolean;
            };
            increment_cart_quantity: {
                Args: {
                    p_customer_id: number;
                    p_variant_id: number;
                    p_new_quantity: number;
                };
                Returns: undefined;
            };
            validate_add_to_cart_shop_limit: {
                Args: {
                    p_customer_id: number;
                    p_variant_id: number;
                    p_new_quantity: number;
                };
                Returns: Json;
            };
            validate_and_adjust_cart_stock: {
                Args: {
                    p_customer_id: number;
                };
                Returns: Json;
            };
            clear_cart: {
                Args: {
                    p_customer_id: number;
                };
                Returns: undefined;
            };
            apply_cart_adjustments: {
                Args: {
                    p_customer_id: number;
                    p_adjustments: Json;
                };
                Returns: undefined;
            };
            transfer_cart_to_kiosk: {
                Args: {
                    p_customer_id: number;
                    p_kiosk_session_id: string;
                };
                Returns: boolean;
            };
            merge_kiosk_to_customer_cart: {
                Args: {
                    p_customer_id: number;
                    p_kiosk_session_id: string;
                };
                Returns: undefined;
            };
        };
        Enums: {
            gender: Gender;
            product_tag: ProductTag;
            order_status: OrderStatus;
            payment_method: PaymentMethod;
            discount_type: DiscountType;
            severity_level: SeverityLevel;
        };
        CompositeTypes: Record<string, never>;
    };
}
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type FunctionArgs<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]['Args'];
export type FunctionReturns<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]['Returns'];
//# sourceMappingURL=database.types.d.ts.map