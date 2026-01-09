import type { Tables, InsertTables, UpdateTables } from '../types/database.types.js';
export declare class AddressRepository {
    /**
     * Get all addresses for a customer
     */
    findByCustomerId(customerId: number): Promise<Tables<'addresses'>[]>;
    /**
     * Get address by ID
     */
    findById(addressId: number): Promise<Tables<'addresses'> | null>;
    /**
     * Create new address
     */
    create(address: InsertTables<'addresses'>): Promise<Tables<'addresses'>>;
    /**
     * Update address
     */
    update(addressId: number, updates: UpdateTables<'addresses'>): Promise<Tables<'addresses'>>;
    /**
     * Delete address
     */
    delete(addressId: number): Promise<boolean>;
    /**
     * Copy address to order_addresses (immutable snapshot)
     * Returns the order_address_id on success
     */
    copyToOrderAddress(addressId: number): Promise<number | null>;
    /**
     * Get order address by ID
     */
    getOrderAddress(orderAddressId: number): Promise<Tables<'order_addresses'> | null>;
    /**
     * Check if address belongs to customer
     */
    belongsToCustomer(addressId: number, customerId: number): Promise<boolean>;
    /**
     * Get address count for customer
     */
    getCount(customerId: number): Promise<number>;
}
export declare const addressRepository: AddressRepository;
//# sourceMappingURL=address.repository.d.ts.map