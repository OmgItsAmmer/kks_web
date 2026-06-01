import { apiRequest } from './api.config';

export interface ShopConfig {
  shopName?: string;
  isShippingEnabled: boolean;
  maxAllowedQuantity: number;
  taxRate: number;
  shippingPrice: number;
  freeShippingThreshold: number | null;
  isAdvancePaymentReceiptMandatory: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

class ShopService {
  async getConfig(): Promise<ShopConfig> {
    const response = await apiRequest<ApiResponse<ShopConfig>>('/shop/config');
    return response.data;
  }
}

export const shopService = new ShopService();
