export interface Address {
  address_id: number;
  shipping_address: string;
  phone_number: string;
  postal_code: string;
  city: string;
  country: string;
  full_name: string;
  customer_id?: number;
  vendor_id?: number;
  salesman_id?: number;
  user_id?: number;
  latitude?: number | string;
  longitude?: number | string;
  place_id?: string;
  formatted_address?: string;
}

export interface CreateAddressRequest {
  fullName: string;
  shippingAddress?: string;
  city?: string;
  postalCode?: string;
  phoneNumber: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  formatted_address?: string;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {}

export interface OrderAddress extends Omit<Address, 'address_id'> {
  order_address_id: number;
  address_id?: number;
}
