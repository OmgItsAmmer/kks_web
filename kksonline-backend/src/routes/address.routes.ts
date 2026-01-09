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

    const { fullName, shippingAddress, city, postalCode, phoneNumber, country } = req.body;

    const address = await addressRepository.create({
      customer_id: req.customerId,
      full_name: fullName,
      shipping_address: shippingAddress,
      city,
      postal_code: postalCode,
      phone_number: phoneNumber,
      country: country || 'Pakistan',
    });

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

    const { fullName, shippingAddress, city, postalCode, phoneNumber, country } = req.body;

    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (shippingAddress !== undefined) updates.shipping_address = shippingAddress;
    if (city !== undefined) updates.city = city;
    if (postalCode !== undefined) updates.postal_code = postalCode;
    if (phoneNumber !== undefined) updates.phone_number = phoneNumber;
    if (country !== undefined) updates.country = country;

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
