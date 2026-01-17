import { apiRequest } from './api.config';
import type { Address, CreateAddressRequest, UpdateAddressRequest } from '../types/address';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class AddressService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/addresses';
  }

  /**
   * Get all addresses for the current customer
   */
  async getAddresses(): Promise<ApiResponse<Address[]>> {
    try {
      const response = await apiRequest<ApiResponse<Address[]>>(this.baseUrl, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('[AddressService] Error fetching addresses:', error);
      throw error;
    }
  }

  /**
   * Get address by ID
   */
  async getAddressById(addressId: number): Promise<Address> {
    try {
      const response = await apiRequest<ApiResponse<Address>>(`${this.baseUrl}/${addressId}`, {
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('[AddressService] Error fetching address:', error);
      throw error;
    }
  }

  /**
   * Create new address
   */
  async createAddress(address: CreateAddressRequest): Promise<ApiResponse<Address>> {
    try {
      const response = await apiRequest<ApiResponse<Address>>(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(address),
      });
      return response;
    } catch (error) {
      console.error('[AddressService] Error creating address:', error);
      throw error;
    }
  }

  /**
   * Update address
   */
  async updateAddress(addressId: number, updates: UpdateAddressRequest): Promise<Address> {
    try {
      const response = await apiRequest<ApiResponse<Address>>(`${this.baseUrl}/${addressId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return response.data;
    } catch (error) {
      console.error('[AddressService] Error updating address:', error);
      throw error;
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(addressId: number): Promise<void> {
    try {
      await apiRequest<void>(`${this.baseUrl}/${addressId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('[AddressService] Error deleting address:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const addressService = new AddressService();
