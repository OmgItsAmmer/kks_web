import { db, Prisma } from '../config/database.config';
import { logger } from '../utils/logger';
import { NotFoundError, InternalServerError } from '../utils/errors';
import { CacheKeys, generateCacheKey, getFromCache, setInCache, deleteFromCache } from '../utils/cache';
import type { Customer, Gender } from '@prisma/client';

export class CustomerRepository {
  /**
   * Get customer by ID
   */
  async findById(customerId: number): Promise<Customer | null> {
    const cacheKey = generateCacheKey(CacheKeys.CUSTOMER, { id: customerId });
    const cached = getFromCache<Customer>(cacheKey);
    if (cached) return cached;

    try {
      const customer = await db.customer.findUnique({
        where: { customer_id: customerId },
      });

      if (customer) {
        setInCache(cacheKey, customer);
      }

      return customer;
    } catch (error) {
      logger.error('Error fetching customer by ID', { error, customerId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get customer by auth UID
   */
  async findByAuthUid(authUid: string): Promise<Customer | null> {
    try {
      const customer = await db.customer.findUnique({
        where: { auth_uid: authUid },
      });
      return customer;
    } catch (error) {
      logger.error('Error fetching customer by auth UID', { error, authUid });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get customer by email
   */
  async findByEmail(email: string): Promise<Customer | null> {
    try {
      const customer = await db.customer.findFirst({
        where: { email },
      });
      return customer;
    } catch (error) {
      logger.error('Error fetching customer by email', { error, email });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Create new customer
   */
  async create(customer: Prisma.CustomerCreateInput): Promise<Customer> {
    try {
      const newCustomer = await db.customer.create({
        data: customer,
      });
      return newCustomer;
    } catch (error) {
      logger.error('Error creating customer', { error, email: customer.email });
      throw new InternalServerError('Failed to create customer');
    }
  }

  /**
   * Update customer
   */
  async update(customerId: number, updates: Prisma.CustomerUpdateInput): Promise<Customer> {
    try {
      const customer = await db.customer.update({
        where: { customer_id: customerId },
        data: updates,
      });

      // Invalidate cache
      deleteFromCache(generateCacheKey(CacheKeys.CUSTOMER, { id: customerId }));

      return customer;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Customer not found');
      }
      logger.error('Error updating customer', { error, customerId });
      throw new InternalServerError('Failed to update customer');
    }
  }

  /**
   * Update customer profile with extra info
   */
  async updateProfile(
    customerId: number,
    profileData: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      cnic?: string;
      gender?: Gender;
      dob?: string;
    }
  ): Promise<Customer> {
    const updates: Prisma.CustomerUpdateInput = {};

    if (profileData.firstName !== undefined) updates.first_name = profileData.firstName;
    if (profileData.lastName !== undefined) updates.last_name = profileData.lastName;
    if (profileData.phoneNumber !== undefined) updates.phone_number = profileData.phoneNumber;
    if (profileData.cnic !== undefined) updates.cnic = profileData.cnic;
    if (profileData.gender !== undefined) updates.gender = profileData.gender;
    if (profileData.dob !== undefined) updates.dob = new Date(profileData.dob);

    return this.update(customerId, updates);
  }

  /**
   * Update FCM token
   */
  async updateFcmToken(customerId: number, fcmToken: string): Promise<void> {
    try {
      await db.customer.update({
        where: { customer_id: customerId },
        data: { fcm_token: fcmToken },
      });

      // Invalidate cache
      deleteFromCache(generateCacheKey(CacheKeys.CUSTOMER, { id: customerId }));
    } catch (error) {
      logger.error('Error updating FCM token', { error, customerId });
    }
  }

  /**
   * Delete customer (for account deletion)
   */
  async delete(customerId: number): Promise<boolean> {
    try {
      await db.customer.delete({
        where: { customer_id: customerId },
      });

      // Invalidate cache
      deleteFromCache(generateCacheKey(CacheKeys.CUSTOMER, { id: customerId }));

      return true;
    } catch (error) {
      logger.error('Error deleting customer', { error, customerId });
      throw new InternalServerError('Failed to delete customer');
    }
  }

  /**
   * Check if customer exists
   */
  async exists(customerId: number): Promise<boolean> {
    try {
      const count = await db.customer.count({
        where: { customer_id: customerId },
      });
      return count > 0;
    } catch (error) {
      logger.error('Error checking customer existence', { error, customerId });
      return false;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const count = await db.customer.count({
        where: { email },
      });
      return count > 0;
    } catch (error) {
      logger.error('Error checking email existence', { error, email });
      return false;
    }
  }

  /**
   * Get customer's full name
   */
  async getFullName(customerId: number): Promise<string> {
    const customer = await this.findById(customerId);
    if (!customer) return 'Anonymous';
    return `${customer.first_name} ${customer.last_name || ''}`.trim();
  }

  /**
   * Get all customers (admin)
   */
  async findAll(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ customers: Customer[]; total: number }> {
    const { page = 1, pageSize = 20, search } = params;
    const offset = (page - 1) * pageSize;

    try {
      const where: Prisma.CustomerWhereInput = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [customers, total] = await Promise.all([
        db.customer.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: offset,
          take: pageSize,
        }),
        db.customer.count({ where }),
      ]);

      return { customers, total };
    } catch (error) {
      logger.error('Error fetching customers', { error });
      throw new InternalServerError('Database error');
    }
  }
}

// Export singleton
export const customerRepository = new CustomerRepository();
