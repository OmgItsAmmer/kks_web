"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerRepository = exports.CustomerRepository = void 0;
const database_config_1 = require("../config/database.config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const cache_1 = require("../utils/cache");
class CustomerRepository {
    /**
     * Get customer by ID
     */
    async findById(customerId) {
        const cacheKey = (0, cache_1.generateCacheKey)(cache_1.CacheKeys.CUSTOMER, { id: customerId });
        const cached = (0, cache_1.getFromCache)(cacheKey);
        if (cached)
            return cached;
        try {
            const customer = await database_config_1.db.customer.findUnique({
                where: { customer_id: customerId },
            });
            if (customer) {
                (0, cache_1.setInCache)(cacheKey, customer);
            }
            return customer;
        }
        catch (error) {
            logger_1.logger.error('Error fetching customer by ID', { error, customerId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get customer by auth UID
     */
    async findByAuthUid(authUid) {
        try {
            const customer = await database_config_1.db.customer.findUnique({
                where: { auth_uid: authUid },
            });
            return customer;
        }
        catch (error) {
            logger_1.logger.error('Error fetching customer by auth UID', { error, authUid });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get customer by email
     */
    async findByEmail(email) {
        try {
            const customer = await database_config_1.db.customer.findFirst({
                where: { email },
            });
            return customer;
        }
        catch (error) {
            logger_1.logger.error('Error fetching customer by email', { error, email });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Create new customer
     */
    async create(customer) {
        try {
            const newCustomer = await database_config_1.db.customer.create({
                data: customer,
            });
            return newCustomer;
        }
        catch (error) {
            logger_1.logger.error('Error creating customer', { error, email: customer.email });
            throw new errors_1.InternalServerError('Failed to create customer');
        }
    }
    /**
     * Update customer
     */
    async update(customerId, updates) {
        try {
            const customer = await database_config_1.db.customer.update({
                where: { customer_id: customerId },
                data: updates,
            });
            // Invalidate cache
            (0, cache_1.deleteFromCache)((0, cache_1.generateCacheKey)(cache_1.CacheKeys.CUSTOMER, { id: customerId }));
            return customer;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError('Customer not found');
            }
            logger_1.logger.error('Error updating customer', { error, customerId });
            throw new errors_1.InternalServerError('Failed to update customer');
        }
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
            updates.dob = new Date(profileData.dob);
        return this.update(customerId, updates);
    }
    /**
     * Update FCM token
     */
    async updateFcmToken(customerId, fcmToken) {
        try {
            await database_config_1.db.customer.update({
                where: { customer_id: customerId },
                data: { fcm_token: fcmToken },
            });
            // Invalidate cache
            (0, cache_1.deleteFromCache)((0, cache_1.generateCacheKey)(cache_1.CacheKeys.CUSTOMER, { id: customerId }));
        }
        catch (error) {
            logger_1.logger.error('Error updating FCM token', { error, customerId });
        }
    }
    /**
     * Delete customer (for account deletion)
     */
    async delete(customerId) {
        try {
            await database_config_1.db.customer.delete({
                where: { customer_id: customerId },
            });
            // Invalidate cache
            (0, cache_1.deleteFromCache)((0, cache_1.generateCacheKey)(cache_1.CacheKeys.CUSTOMER, { id: customerId }));
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting customer', { error, customerId });
            throw new errors_1.InternalServerError('Failed to delete customer');
        }
    }
    /**
     * Check if customer exists
     */
    async exists(customerId) {
        try {
            const count = await database_config_1.db.customer.count({
                where: { customer_id: customerId },
            });
            return count > 0;
        }
        catch (error) {
            logger_1.logger.error('Error checking customer existence', { error, customerId });
            return false;
        }
    }
    /**
     * Check if email exists
     */
    async emailExists(email) {
        try {
            const count = await database_config_1.db.customer.count({
                where: { email },
            });
            return count > 0;
        }
        catch (error) {
            logger_1.logger.error('Error checking email existence', { error, email });
            return false;
        }
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
        try {
            const where = {};
            if (search) {
                where.OR = [
                    { email: { contains: search, mode: 'insensitive' } },
                    { first_name: { contains: search, mode: 'insensitive' } },
                    { last_name: { contains: search, mode: 'insensitive' } },
                ];
            }
            const [customers, total] = await Promise.all([
                database_config_1.db.customer.findMany({
                    where,
                    orderBy: { created_at: 'desc' },
                    skip: offset,
                    take: pageSize,
                }),
                database_config_1.db.customer.count({ where }),
            ]);
            return { customers, total };
        }
        catch (error) {
            logger_1.logger.error('Error fetching customers', { error });
            throw new errors_1.InternalServerError('Database error');
        }
    }
}
exports.CustomerRepository = CustomerRepository;
// Export singleton
exports.customerRepository = new CustomerRepository();
//# sourceMappingURL=customer.repository.js.map