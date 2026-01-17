"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const address_repository_ts_1 = require("../repositories/address.repository.ts");
const validation_middleware_ts_1 = require("../middleware/validation.middleware.ts");
const error_middleware_ts_1 = require("../middleware/error.middleware.ts");
const customer_middleware_ts_1 = require("../middleware/customer.middleware.ts");
const response_ts_1 = require("../utils/response.ts");
const errors_ts_1 = require("../utils/errors.ts");
const router = (0, express_1.Router)();
// All address routes require customer identification
router.use(customer_middleware_ts_1.requireCustomer);
/**
 * @route   GET /api/v1/addresses
 * @desc    Get all addresses for current customer
 * @access  Private
 */
router.get('/', (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const addresses = await address_repository_ts_1.addressRepository.findByCustomerId(req.customerId);
    return (0, response_ts_1.sendSuccess)(res, addresses);
}));
/**
 * @route   GET /api/v1/addresses/:id
 * @desc    Get address by ID
 * @access  Private
 */
router.get('/:id', (0, validation_middleware_ts_1.validate)({ params: validation_middleware_ts_1.schemas.idParam }), (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const addressId = parseInt(req.params.id, 10);
    const address = await address_repository_ts_1.addressRepository.findById(addressId);
    if (!address) {
        return (0, response_ts_1.sendNotFound)(res, 'Address not found');
    }
    // Verify ownership
    if (address.customer_id !== req.customerId) {
        throw new errors_ts_1.ForbiddenError('Access denied to this address');
    }
    return (0, response_ts_1.sendSuccess)(res, address);
}));
/**
 * @route   POST /api/v1/addresses
 * @desc    Create new address
 * @access  Private
 */
router.post('/', (0, validation_middleware_ts_1.validate)({ body: validation_middleware_ts_1.schemas.address }), (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const { fullName, shippingAddress, city, postalCode, phoneNumber, country } = req.body;
    // Build address data object
    const addressData = {
        customer_id: req.customerId,
        full_name: fullName,
        shipping_address: shippingAddress || '',
        city: city || '',
        phone_number: phoneNumber || '',
        country: country || 'Pakistan',
    };
    // Only include postal_code if provided and not empty (to avoid validation issues)
    if (postalCode && typeof postalCode === 'string' && postalCode.trim().length >= 3) {
        addressData.postal_code = postalCode.trim();
    }
    console.log('Creating address with data:', addressData);
    const address = await address_repository_ts_1.addressRepository.create(addressData);
    return (0, response_ts_1.sendCreated)(res, address, 'Address created successfully');
}));
/**
 * @route   PUT /api/v1/addresses/:id
 * @desc    Update address
 * @access  Private
 */
router.put('/:id', (0, validation_middleware_ts_1.validate)({
    params: validation_middleware_ts_1.schemas.idParam,
    body: validation_middleware_ts_1.schemas.address.partial(),
}), (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const addressId = parseInt(req.params.id, 10);
    // Verify ownership
    const belongs = await address_repository_ts_1.addressRepository.belongsToCustomer(addressId, req.customerId);
    if (!belongs) {
        throw new errors_ts_1.ForbiddenError('Access denied to this address');
    }
    const { fullName, shippingAddress, city, postalCode, phoneNumber, country } = req.body;
    const updates = {};
    if (fullName !== undefined)
        updates.full_name = fullName;
    if (shippingAddress !== undefined)
        updates.shipping_address = shippingAddress;
    if (city !== undefined)
        updates.city = city;
    if (postalCode !== undefined)
        updates.postal_code = postalCode;
    if (phoneNumber !== undefined)
        updates.phone_number = phoneNumber;
    if (country !== undefined)
        updates.country = country;
    const address = await address_repository_ts_1.addressRepository.update(addressId, updates);
    return (0, response_ts_1.sendSuccess)(res, address, 'Address updated successfully');
}));
/**
 * @route   DELETE /api/v1/addresses/:id
 * @desc    Delete address
 * @access  Private
 */
router.delete('/:id', (0, validation_middleware_ts_1.validate)({ params: validation_middleware_ts_1.schemas.idParam }), (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const addressId = parseInt(req.params.id, 10);
    // Verify ownership
    const belongs = await address_repository_ts_1.addressRepository.belongsToCustomer(addressId, req.customerId);
    if (!belongs) {
        throw new errors_ts_1.ForbiddenError('Access denied to this address');
    }
    await address_repository_ts_1.addressRepository.delete(addressId);
    return (0, response_ts_1.sendNoContent)(res);
}));
exports.default = router;
//# sourceMappingURL=address.routes.js.map