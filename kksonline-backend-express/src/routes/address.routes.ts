import { Router, type Response } from 'express';
import { addressRepository } from "../repositories/address.repository.ts";
import { validate, schemas } from "../middleware/validation.middleware.ts";
import { asyncHandler } from "../middleware/error.middleware.ts";
import { requireCustomer } from "../middleware/customer.middleware.ts";
import { sendSuccess, sendCreated, sendNoContent, sendNotFound, sendError } from "../utils/response.ts";
import { ForbiddenError } from "../utils/errors.ts";
import type { CustomerRequest } from "../types/api.types.ts";

const router = Router();

// All address routes require customer identification
router.use(requireCustomer);

/**
 * @route   GET /api/v1/addresses
 * @desc    Get all addresses for current customer
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const addresses = await addressRepository.findByCustomerId(req.customerId);

    return sendSuccess(res, addresses);
  })
);

/**
 * @route   GET /api/v1/addresses/:id
 * @desc    Get address by ID
 * @access  Private
 */
router.get(
  '/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const addressId = parseInt(req.params.id!, 10);
    const address = await addressRepository.findById(addressId);

    if (!address) {
      return sendNotFound(res, 'Address not found');
    }

    // Verify ownership
    if (address.customer_id !== req.customerId) {
      throw new ForbiddenError('Access denied to this address');
    }

    return sendSuccess(res, address);
  })
);

/**
 * @route   POST /api/v1/addresses
 * @desc    Create new address
 * @access  Private
 */
router.post(
  '/',
  validate({ body: schemas.address }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { 
      fullName, 
      shippingAddress, 
      city, 
      postalCode, 
      phoneNumber, 
      country,
      latitude,
      longitude,
      place_id,
      formatted_address
    } = req.body;

    // Trim all string values to remove leading/trailing whitespace
    // The validation schema ensures required fields are not empty, but we trim to be safe
    const addressData: any = {
      customer_id: req.customerId,
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      country: (country || 'Pakistan').trim(),
    };

    // Use Google Maps formatted_address if available, otherwise use shippingAddress
    if (formatted_address) {
      addressData.shipping_address = formatted_address.trim();
    } else if (shippingAddress) {
      addressData.shipping_address = shippingAddress.trim();
    }

    // Use city from Google Maps or provided city
    if (city) {
      addressData.city = city.trim();
    }

    // Only include postal_code if provided and not empty (to avoid validation issues)
    // Use null instead of empty string for optional fields to satisfy check constraint
    if (postalCode && typeof postalCode === 'string' && postalCode.trim().length >= 3) {
      addressData.postal_code = postalCode.trim();
    }

    // Add Google Maps location data
    if (latitude !== undefined && longitude !== undefined) {
      addressData.latitude = latitude;
      addressData.longitude = longitude;
    }

    if (place_id) {
      addressData.place_id = place_id.trim();
    }

    if (formatted_address) {
      addressData.formatted_address = formatted_address.trim();
    }

    console.log('Creating address with data:', addressData);

    const address = await addressRepository.create(addressData);

    return sendCreated(res, address, 'Address created successfully');
  })
);

/**
 * @route   PUT /api/v1/addresses/:id
 * @desc    Update address
 * @access  Private
 */
router.put(
  '/:id',
  validate({
    params: schemas.idParam,
    body: schemas.address.partial(),
  }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const addressId = parseInt(req.params.id!, 10);

    // Verify ownership
    const belongs = await addressRepository.belongsToCustomer(addressId, req.customerId);
    if (!belongs) {
      throw new ForbiddenError('Access denied to this address');
    }

    const { 
      fullName, 
      shippingAddress, 
      city, 
      postalCode, 
      phoneNumber, 
      country,
      latitude,
      longitude,
      place_id,
      formatted_address
    } = req.body;

    const updates: Record<string, unknown> = {};
    // Trim all string values to ensure they satisfy the check constraint
    if (fullName !== undefined) updates.full_name = typeof fullName === 'string' ? fullName.trim() : fullName;
    if (shippingAddress !== undefined) updates.shipping_address = typeof shippingAddress === 'string' ? shippingAddress.trim() : shippingAddress;
    if (formatted_address !== undefined) {
      // Prefer formatted_address over shippingAddress if both provided
      updates.shipping_address = typeof formatted_address === 'string' ? formatted_address.trim() : formatted_address;
    }
    if (city !== undefined) updates.city = typeof city === 'string' ? city.trim() : city;
    if (postalCode !== undefined) {
      // For postal code, use null if empty/whitespace, otherwise trim
      const trimmed = typeof postalCode === 'string' ? postalCode.trim() : postalCode;
      updates.postal_code = trimmed && trimmed.length >= 3 ? trimmed : null;
    }
    if (phoneNumber !== undefined) updates.phone_number = typeof phoneNumber === 'string' ? phoneNumber.trim() : phoneNumber;
    if (country !== undefined) updates.country = typeof country === 'string' ? country.trim() : country;
    
    // Google Maps fields
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;
    if (place_id !== undefined) updates.place_id = typeof place_id === 'string' ? place_id.trim() : place_id;
    if (formatted_address !== undefined) updates.formatted_address = typeof formatted_address === 'string' ? formatted_address.trim() : formatted_address;

    const address = await addressRepository.update(addressId, updates);

    return sendSuccess(res, address, 'Address updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/addresses/:id
 * @desc    Delete address
 * @access  Private
 */
router.delete(
  '/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const addressId = parseInt(req.params.id!, 10);

    // Verify ownership
    const belongs = await addressRepository.belongsToCustomer(addressId, req.customerId);
    if (!belongs) {
      throw new ForbiddenError('Access denied to this address');
    }

    await addressRepository.delete(addressId);

    return sendNoContent(res);
  })
);

export default router;
