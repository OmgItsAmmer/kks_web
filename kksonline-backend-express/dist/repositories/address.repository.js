"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressRepository = exports.AddressRepository = void 0;
const database_config_ts_1 = require("../config/database.config.ts");
const logger_ts_1 = require("../utils/logger.ts");
const errors_ts_1 = require("../utils/errors.ts");
class AddressRepository {
    /**
     * Get all addresses for a customer
     */
    async findByCustomerId(customerId) {
        try {
            const addresses = await database_config_ts_1.db.address.findMany({
                where: { customer_id: customerId },
                orderBy: { address_id: 'desc' },
            });
            return addresses;
        }
        catch (error) {
            logger_ts_1.logger.error('Error fetching addresses', { error, customerId });
            throw new errors_ts_1.InternalServerError('Database error');
        }
    }
    /**
     * Get address by ID
     */
    async findById(addressId) {
        try {
            const address = await database_config_ts_1.db.address.findUnique({
                where: { address_id: addressId },
            });
            return address;
        }
        catch (error) {
            logger_ts_1.logger.error('Error fetching address', { error, addressId });
            throw new errors_ts_1.InternalServerError('Database error');
        }
    }
    /**
     * Create new address
     */
    async create(address) {
        try {
            const newAddress = await database_config_ts_1.db.address.create({
                data: address,
            });
            return newAddress;
        }
        catch (error) {
            logger_ts_1.logger.error('Error creating address', { error, addressData: address });
            // Check if it's a Prisma validation error
            if (error.code === 'P2002') {
                throw new errors_ts_1.InternalServerError('Address with this information already exists');
            }
            if (error.code === 'P2003') {
                throw new errors_ts_1.InternalServerError('Invalid reference: customer, vendor, salesman, or user not found');
            }
            // Check for check constraint violations (PostgreSQL error code 23514)
            const errorMessage = error.message || '';
            if (errorMessage.includes('chk_valid_text_fields') || errorMessage.includes('violates check constraint')) {
                throw new errors_ts_1.InternalServerError('Invalid address data: text fields must not be empty or contain only whitespace');
            }
            // Include more details in development
            const finalMessage = process.env.NODE_ENV === 'development'
                ? `Failed to create address: ${errorMessage || 'Unknown error'}`
                : 'Failed to create address';
            throw new errors_ts_1.InternalServerError(finalMessage);
        }
    }
    /**
     * Update address
     */
    async update(addressId, updates) {
        try {
            const address = await database_config_ts_1.db.address.update({
                where: { address_id: addressId },
                data: updates,
            });
            return address;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_ts_1.NotFoundError('Address not found');
            }
            // Check for check constraint violations
            const errorMessage = error.message || '';
            if (errorMessage.includes('chk_valid_text_fields') || errorMessage.includes('violates check constraint')) {
                throw new errors_ts_1.InternalServerError('Invalid address data: text fields must not be empty or contain only whitespace');
            }
            logger_ts_1.logger.error('Error updating address', { error, addressId });
            throw new errors_ts_1.InternalServerError('Failed to update address');
        }
    }
    /**
     * Delete address
     */
    async delete(addressId) {
        try {
            await database_config_ts_1.db.address.delete({
                where: { address_id: addressId },
            });
            return true;
        }
        catch (error) {
            logger_ts_1.logger.error('Error deleting address', { error, addressId });
            throw new errors_ts_1.InternalServerError('Failed to delete address');
        }
    }
    /**
     * Copy address to order_addresses (immutable snapshot)
     * Returns the order_address_id on success
     */
    async copyToOrderAddress(addressId) {
        try {
            const address = await this.findById(addressId);
            if (!address) {
                return null;
            }
            const orderAddress = await database_config_ts_1.db.orderAddress.create({
                data: {
                    shipping_address: address.shipping_address,
                    phone_number: address.phone_number,
                    postal_code: address.postal_code,
                    city: address.city,
                    country: address.country,
                    full_name: address.full_name,
                    customer_id: address.customer_id,
                    vendor_id: address.vendor_id,
                    salesman_id: address.salesman_id,
                    user_id: address.user_id,
                    address_id: address.address_id,
                    // Copy Google Maps fields
                    latitude: address.latitude,
                    longitude: address.longitude,
                    place_id: address.place_id,
                    formatted_address: address.formatted_address,
                },
            });
            return orderAddress.order_address_id;
        }
        catch (error) {
            logger_ts_1.logger.error('Error copying address to order address', { error, addressId });
            return null;
        }
    }
    /**
     * Get order address by ID
     */
    async getOrderAddress(orderAddressId) {
        try {
            const orderAddress = await database_config_ts_1.db.orderAddress.findUnique({
                where: { order_address_id: orderAddressId },
            });
            return orderAddress;
        }
        catch (error) {
            logger_ts_1.logger.error('Error fetching order address', { error, orderAddressId });
            throw new errors_ts_1.InternalServerError('Database error');
        }
    }
    /**
     * Check if address belongs to customer
     */
    async belongsToCustomer(addressId, customerId) {
        try {
            const address = await database_config_ts_1.db.address.findFirst({
                where: {
                    address_id: addressId,
                    customer_id: customerId,
                },
            });
            return !!address;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get address count for customer
     */
    async getCount(customerId) {
        try {
            const count = await database_config_ts_1.db.address.count({
                where: { customer_id: customerId },
            });
            return count;
        }
        catch (error) {
            logger_ts_1.logger.error('Error getting address count', { error, customerId });
            return 0;
        }
    }
}
exports.AddressRepository = AddressRepository;
// Export singleton
exports.addressRepository = new AddressRepository();
//# sourceMappingURL=address.repository.js.map