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
    const { fullName, shippingAddress, city, postalCode, phoneNumber, country, latitude, longitude, place_id, formatted_address } = req.body;
    // Helper function to get non-empty trimmed value or undefined
    const getNonEmpty = (value) => {
        if (typeof value !== 'string')
            return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    };
    // Build address data - only required fields guaranteed
    const addressData = {
        customer_id: req.customerId,
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        country: getNonEmpty(country) || 'Pakistan',
    };
    // Optional fields - only add if they have non-empty values
    const formattedAddr = getNonEmpty(formatted_address);
    const shippingAddr = getNonEmpty(shippingAddress);
    if (formattedAddr) {
        addressData.shipping_address = formattedAddr;
    }
    else if (shippingAddr) {
        addressData.shipping_address = shippingAddr;
    }
    const cityValue = getNonEmpty(city);
    if (cityValue) {
        addressData.city = cityValue;
    }
    const postalValue = getNonEmpty(postalCode);
    if (postalValue && postalValue.length >= 3) {
        addressData.postal_code = postalValue;
    }
    // Google Maps location data
    if (latitude !== undefined && longitude !== undefined) {
        addressData.latitude = latitude;
        addressData.longitude = longitude;
    }
    const placeIdValue = getNonEmpty(place_id);
    if (placeIdValue) {
        addressData.place_id = placeIdValue;
    }
    const formattedAddressValue = getNonEmpty(formatted_address);
    if (formattedAddressValue) {
        addressData.formatted_address = formattedAddressValue;
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
    const { fullName, shippingAddress, city, postalCode, phoneNumber, country, latitude, longitude, place_id, formatted_address } = req.body;
    const updates = {};
    // Trim all string values to ensure they satisfy the check constraint
    if (fullName !== undefined)
        updates.full_name = typeof fullName === 'string' ? fullName.trim() : fullName;
    if (shippingAddress !== undefined)
        updates.shipping_address = typeof shippingAddress === 'string' ? shippingAddress.trim() : shippingAddress;
    if (formatted_address !== undefined) {
        // Prefer formatted_address over shippingAddress if both provided
        updates.shipping_address = typeof formatted_address === 'string' ? formatted_address.trim() : formatted_address;
    }
    if (city !== undefined)
        updates.city = typeof city === 'string' ? city.trim() : city;
    if (postalCode !== undefined) {
        // For postal code, use null if empty/whitespace, otherwise trim
        const trimmed = typeof postalCode === 'string' ? postalCode.trim() : postalCode;
        updates.postal_code = trimmed && trimmed.length >= 3 ? trimmed : null;
    }
    if (phoneNumber !== undefined)
        updates.phone_number = typeof phoneNumber === 'string' ? phoneNumber.trim() : phoneNumber;
    if (country !== undefined)
        updates.country = typeof country === 'string' ? country.trim() : country;
    // Google Maps fields
    if (latitude !== undefined)
        updates.latitude = latitude;
    if (longitude !== undefined)
        updates.longitude = longitude;
    if (place_id !== undefined)
        updates.place_id = typeof place_id === 'string' ? place_id.trim() : place_id;
    if (formatted_address !== undefined)
        updates.formatted_address = typeof formatted_address === 'string' ? formatted_address.trim() : formatted_address;
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