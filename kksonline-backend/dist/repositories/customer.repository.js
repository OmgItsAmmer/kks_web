import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, InternalServerError } from '../utils/errors.js';
import { CacheKeys, generateCacheKey, getFromCache, setInCache, deleteFromCache } from '../utils/cache.js';
export class CustomerRepository {
    /**
     * Get customer by ID
     */
    async findById(customerId) {
        const cacheKey = generateCacheKey(CacheKeys.CUSTOMER, { id: customerId });
        const cached = getFromCache(cacheKey);
        if (cached)
            return cached;
        const { data, error } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('customer_id', customerId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching customer by ID', { error, customerId });
            throw new InternalServerError('Database error');
        }
        if (data) {
            setInCache(cacheKey, data);
        }
        return data;
    }
    /**
     * Get customer by auth UID
     */
    async findByAuthUid(authUid) {
        const { data, error } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('auth_uid', authUid)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching customer by auth UID', { error, authUid });
            throw new InternalServerError('Database error');
        }
        return data;
    }
    /**
     * Get customer by email
     */
    async findByEmail(email) {
        const { data, error } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('email', email)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching customer by email', { error, email });
            throw new InternalServerError('Database error');
        }
        return data;
    }
    /**
     * Create new customer
     */
    async create(customer) {
        const { data, error } = await supabaseAdmin
            .from('customers')
            .insert(customer)
            .select()
            .single();
        if (error) {
            logger.error('Error creating customer', { error, email: customer.email });
            throw new InternalServerError('Failed to create customer');
        }
        return data;
    }
    /**
     * Update customer
     */
    async update(customerId, updates) {
        const { data, error } = await supabaseAdmin
            .from('customers')
            .update(updates)
            .eq('customer_id', customerId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Customer not found');
            }
            logger.error('Error updating customer', { error, customerId });
            throw new InternalServerError('Failed to update customer');
        }
        // Invalidate cache
        deleteFromCache(generateCacheKey(CacheKeys.CUSTOMER, { id: customerId }));
        return data;
    }
    /**
     * Update customer profile with extra info
     */
    async updateProfile(customerId, profileData) {
        const updates = {};
        if (profileData.firstName !== undefined)
            updates.first_name = profileData.firstName;
        if (profileData.lastName !== undefined)
            updates.last_name = profileData.lastName;
        if (profileData.phoneNumber !== undefined)
            updates.phone_number = profileData.phoneNumber;
        if (profileData.cnic !== undefined)
            updates.cnic = profileData.cnic;
        if (profileData.gender !== undefined)
            updates.gender = profileData.gender;
        if (profileData.dob !== undefined)
            updates.dob = profileData.dob;
        return this.update(customerId, updates);
    }
    /**
     * Update FCM token
     */
    async updateFcmToken(customerId, fcmToken) {
        const { error } = await supabaseAdmin
            .from('customers')
            .update({ fcm_token: fcmToken })
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error updating FCM token', { error, customerId });
        }
        // Invalidate cache
        deleteFromCache(generateCacheKey(CacheKeys.CUSTOMER, { id: customerId }));
    }
    /**
     * Delete customer (for account deletion)
     */
    async delete(customerId) {
        const { error } = await supabaseAdmin
            .from('customers')
            .delete()
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error deleting customer', { error, customerId });
            throw new InternalServerError('Failed to delete customer');
        }
        // Invalidate cache
        deleteFromCache(generateCacheKey(CacheKeys.CUSTOMER, { id: customerId }));
        return true;
    }
    /**
     * Check if customer exists
     */
    async exists(customerId) {
        const { count, error } = await supabaseAdmin
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error checking customer existence', { error, customerId });
            return false;
        }
        return (count || 0) > 0;
    }
    /**
     * Check if email exists
     */
    async emailExists(email) {
        const { count, error } = await supabaseAdmin
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('email', email);
        if (error) {
            logger.error('Error checking email existence', { error, email });
            return false;
        }
        return (count || 0) > 0;
    }
    /**
     * Get customer's full name
     */
    async getFullName(customerId) {
        const customer = await this.findById(customerId);
        if (!customer)
            return 'Anonymous';
        return `${customer.first_name} ${customer.last_name || ''}`.trim();
    }
    /**
     * Get all customers (admin)
     */
    async findAll(params) {
        const { page = 1, pageSize = 20, search } = params;
        const offset = (page - 1) * pageSize;
        let query = supabaseAdmin
            .from('customers')
            .select('*', { count: 'exact' });
        if (search) {
            query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
        }
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);
        if (error) {
            logger.error('Error fetching customers', { error });
            throw new InternalServerError('Database error');
        }
        return {
            customers: data || [],
            total: count || 0,
        };
    }
}
// Export singleton
export const customerRepository = new CustomerRepository();
//# sourceMappingURL=customer.repository.js.map