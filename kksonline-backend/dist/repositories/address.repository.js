import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { InternalServerError, NotFoundError } from '../utils/errors.js';
export class AddressRepository {
    /**
     * Get all addresses for a customer
     */
    async findByCustomerId(customerId) {
        const { data, error } = await supabaseAdmin
            .from('addresses')
            .select('*')
            .eq('customer_id', customerId)
            .order('address_id', { ascending: false });
        if (error) {
            logger.error('Error fetching addresses', { error, customerId });
            throw new InternalServerError('Database error');
        }
        return data || [];
    }
    /**
     * Get address by ID
     */
    async findById(addressId) {
        const { data, error } = await supabaseAdmin
            .from('addresses')
            .select('*')
            .eq('address_id', addressId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching address', { error, addressId });
            throw new InternalServerError('Database error');
        }
        return data;
    }
    /**
     * Create new address
     */
    async create(address) {
        const { data, error } = await supabaseAdmin
            .from('addresses')
            .insert(address)
            .select()
            .single();
        if (error) {
            logger.error('Error creating address', { error });
            throw new InternalServerError('Failed to create address');
        }
        return data;
    }
    /**
     * Update address
     */
    async update(addressId, updates) {
        const { data, error } = await supabaseAdmin
            .from('addresses')
            .update(updates)
            .eq('address_id', addressId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Address not found');
            }
            logger.error('Error updating address', { error, addressId });
            throw new InternalServerError('Failed to update address');
        }
        return data;
    }
    /**
     * Delete address
     */
    async delete(addressId) {
        const { error } = await supabaseAdmin
            .from('addresses')
            .delete()
            .eq('address_id', addressId);
        if (error) {
            logger.error('Error deleting address', { error, addressId });
            throw new InternalServerError('Failed to delete address');
        }
        return true;
    }
    /**
     * Copy address to order_addresses (immutable snapshot)
     * Returns the order_address_id on success
     */
    async copyToOrderAddress(addressId) {
        const { data, error } = await supabaseAdmin.rpc('copy_address_to_order_address', {
            p_address_id: addressId,
        });
        if (error) {
            logger.error('Error copying address to order address', { error, addressId });
            return null;
        }
        return data ?? null;
    }
    /**
     * Get order address by ID
     */
    async getOrderAddress(orderAddressId) {
        const { data, error } = await supabaseAdmin
            .from('order_addresses')
            .select('*')
            .eq('order_address_id', orderAddressId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching order address', { error, orderAddressId });
            throw new InternalServerError('Database error');
        }
        return data;
    }
    /**
     * Check if address belongs to customer
     */
    async belongsToCustomer(addressId, customerId) {
        const { data, error } = await supabaseAdmin
            .from('addresses')
            .select('address_id')
            .eq('address_id', addressId)
            .eq('customer_id', customerId)
            .single();
        if (error || !data) {
            return false;
        }
        return true;
    }
    /**
     * Get address count for customer
     */
    async getCount(customerId) {
        const { count, error } = await supabaseAdmin
            .from('addresses')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error getting address count', { error, customerId });
            return 0;
        }
        return count || 0;
    }
}
// Export singleton
export const addressRepository = new AddressRepository();
//# sourceMappingURL=address.repository.js.map