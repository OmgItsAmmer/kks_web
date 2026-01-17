import { Prisma } from '../config/database.config';
import type { Customer, Gender } from '@prisma/client';
export declare class CustomerRepository {
    /**
     * Get customer by ID
     */
    findById(customerId: number): Promise<Customer | null>;
    /**
     * Get customer by auth UID
     */
    findByAuthUid(authUid: string): Promise<Customer | null>;
    /**
     * Get customer by email
     */
    findByEmail(email: string): Promise<Customer | null>;
    /**
     * Create new customer
     */
    create(customer: Prisma.CustomerCreateInput): Promise<Customer>;
    /**
     * Update customer
     */
    update(customerId: number, updates: Prisma.CustomerUpdateInput): Promise<Customer>;
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
    }): Promise<Customer>;
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
        customers: Customer[];
        total: number;
    }>;
}
export declare const customerRepository: CustomerRepository;
//# sourceMappingURL=customer.repository.d.ts.map