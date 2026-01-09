import type { Tables, InsertTables, UpdateTables, Gender } from '../types/database.types.js';
export declare class CustomerRepository {
    /**
     * Get customer by ID
     */
    findById(customerId: number): Promise<Tables<'customers'> | null>;
    /**
     * Get customer by auth UID
     */
    findByAuthUid(authUid: string): Promise<Tables<'customers'> | null>;
    /**
     * Get customer by email
     */
    findByEmail(email: string): Promise<Tables<'customers'> | null>;
    /**
     * Create new customer
     */
    create(customer: InsertTables<'customers'>): Promise<Tables<'customers'>>;
    /**
     * Update customer
     */
    update(customerId: number, updates: UpdateTables<'customers'>): Promise<Tables<'customers'>>;
    /**
     * Update customer profile with extra info
     */
    updateProfile(customerId: number, profileData: {
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
        cnic?: string;
        gender?: Gender;
        dob?: string;
    }): Promise<Tables<'customers'>>;
    /**
     * Update FCM token
     */
    updateFcmToken(customerId: number, fcmToken: string): Promise<void>;
    /**
     * Delete customer (for account deletion)
     */
    delete(customerId: number): Promise<boolean>;
    /**
     * Check if customer exists
     */
    exists(customerId: number): Promise<boolean>;
    /**
     * Check if email exists
     */
    emailExists(email: string): Promise<boolean>;
    /**
     * Get customer's full name
     */
    getFullName(customerId: number): Promise<string>;
    /**
     * Get all customers (admin)
     */
    findAll(params: {
        page?: number;
        pageSize?: number;
        search?: string;
    }): Promise<{
        customers: Tables<'customers'>[];
        total: number;
    }>;
}
export declare const customerRepository: CustomerRepository;
//# sourceMappingURL=customer.repository.d.ts.map