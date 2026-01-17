import { Prisma } from '../config/database.config';
import type { Address, OrderAddress } from '@prisma/client';
export declare class AddressRepository {
    /**
     * Get all addresses for a customer
     */
    findByCustomerId(customerId: number): Promise<Address[]>;
    /**
     * Get address by ID
     */
    findById(addressId: number): Promise<Address | null>;
    /**
     * Create new address
     */
    create(address: Prisma.AddressCreateInput): Promise<Address>;
    /**
     * Update address
     */
    update(addressId: number, updates: Prisma.AddressUpdateInput): Promise<Address>;
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
    getOrderAddress(orderAddressId: number): Promise<OrderAddress | null>;
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