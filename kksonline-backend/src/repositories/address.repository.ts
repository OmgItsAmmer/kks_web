import { db, Prisma } from '../config/database.config.ts';
import { logger } from '../utils/logger.ts';
import { InternalServerError, NotFoundError } from '../utils/errors.ts';
import type { Address, OrderAddress } from '@prisma/client';

export class AddressRepository {
  /**
   * Get all addresses for a customer
   */
  async findByCustomerId(customerId: number): Promise<Address[]> {
    try {
      const addresses = await db.address.findMany({
        where: { customer_id: customerId },
        orderBy: { address_id: 'desc' },
      });
      return addresses;
    } catch (error) {
      logger.error('Error fetching addresses', { error, customerId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get address by ID
   */
  async findById(addressId: number): Promise<Address | null> {
    try {
      const address = await db.address.findUnique({
        where: { address_id: addressId },
      });
      return address;
    } catch (error) {
      logger.error('Error fetching address', { error, addressId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Create new address
   */
  async create(address: Prisma.AddressCreateInput): Promise<Address> {
    try {
      const newAddress = await db.address.create({
        data: address,
      });
      return newAddress;
    } catch (error) {
      logger.error('Error creating address', { error });
      throw new InternalServerError('Failed to create address');
    }
  }

  /**
   * Update address
   */
  async update(addressId: number, updates: Prisma.AddressUpdateInput): Promise<Address> {
    try {
      const address = await db.address.update({
        where: { address_id: addressId },
        data: updates,
      });
      return address;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Address not found');
      }
      logger.error('Error updating address', { error, addressId });
      throw new InternalServerError('Failed to update address');
    }
  }

  /**
   * Delete address
   */
  async delete(addressId: number): Promise<boolean> {
    try {
      await db.address.delete({
        where: { address_id: addressId },
      });
      return true;
    } catch (error) {
      logger.error('Error deleting address', { error, addressId });
      throw new InternalServerError('Failed to delete address');
    }
  }

  /**
   * Copy address to order_addresses (immutable snapshot)
   * Returns the order_address_id on success
   */
  async copyToOrderAddress(addressId: number): Promise<number | null> {
    try {
      const address = await this.findById(addressId);
      if (!address) {
        return null;
      }

      const orderAddress = await db.orderAddress.create({
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
        },
      });

      return orderAddress.order_address_id;
    } catch (error) {
      logger.error('Error copying address to order address', { error, addressId });
      return null;
    }
  }

  /**
   * Get order address by ID
   */
  async getOrderAddress(orderAddressId: number): Promise<OrderAddress | null> {
    try {
      const orderAddress = await db.orderAddress.findUnique({
        where: { order_address_id: orderAddressId },
      });
      return orderAddress;
    } catch (error) {
      logger.error('Error fetching order address', { error, orderAddressId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Check if address belongs to customer
   */
  async belongsToCustomer(addressId: number, customerId: number): Promise<boolean> {
    try {
      const address = await db.address.findFirst({
        where: {
          address_id: addressId,
          customer_id: customerId,
        },
      });
      return !!address;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get address count for customer
   */
  async getCount(customerId: number): Promise<number> {
    try {
      const count = await db.address.count({
        where: { customer_id: customerId },
      });
      return count;
    } catch (error) {
      logger.error('Error getting address count', { error, customerId });
      return 0;
    }
  }
}

// Export singleton
export const addressRepository = new AddressRepository();
