"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shop_repository_1 = require("../repositories/shop.repository");
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const feature_flags_1 = require("../config/feature-flags");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/shop/config
 * @desc    Get shop configuration
 * @access  Public
 */
router.get('/config', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const config = await shop_repository_1.shopRepository.getConfig();
    if (!config) {
        return (0, response_1.sendSuccess)(res, {
            isShippingEnabled: false,
            maxAllowedQuantity: 50,
            taxRate: 0,
            shippingPrice: 0,
            freeShippingThreshold: null,
            isAdvancePaymentReceiptMandatory: feature_flags_1.ADVANCE_PAYMENT_RECEIPT_ENABLED,
        });
    }
    return (0, response_1.sendSuccess)(res, {
        shopName: config.shopname,
        isShippingEnabled: config.is_shipping_enable,
        maxAllowedQuantity: Number(config.max_allowed_item_quantity),
        taxRate: Number(config.taxrate),
        shippingPrice: Number(config.shipping_price),
        freeShippingThreshold: config.threshold_free_shipping ? Number(config.threshold_free_shipping) : null,
        isAdvancePaymentReceiptMandatory: feature_flags_1.ADVANCE_PAYMENT_RECEIPT_ENABLED
            ? config.is_advance_payment_receipt_mandatory
            : false,
    });
}));
/**
 * @route   GET /api/v1/shop/app-version
 * @desc    Get latest app version info
 * @access  Public
 */
router.get('/app-version', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const version = await shop_repository_1.shopRepository.getLatestAppVersion();
    if (!version) {
        return (0, response_1.sendSuccess)(res, {
            version: null,
            forceUpdate: false,
            appLocked: false,
        });
    }
    return (0, response_1.sendSuccess)(res, {
        version: version.version,
        forceUpdate: version.force_update,
        appLocked: version.app_locked,
        redirectUrl: version.redirect_url,
        description: version.description,
    });
}));
/**
 * @route   POST /api/v1/shop/check-version
 * @desc    Check if app update is required
 * @access  Public
 */
router.post('/check-version', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { currentVersion } = req.body;
    if (!currentVersion || typeof currentVersion !== 'string') {
        return (0, response_1.sendSuccess)(res, {
            updateRequired: false,
            forceUpdate: false,
            isLocked: false,
        });
    }
    const result = await shop_repository_1.shopRepository.checkAppVersion(currentVersion);
    return (0, response_1.sendSuccess)(res, result);
}));
/**
 * @route   GET /api/v1/shop/shipping-enabled
 * @desc    Check if shipping is enabled
 * @access  Public
 */
router.get('/shipping-enabled', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const isEnabled = await shop_repository_1.shopRepository.isShippingEnabled();
    return (0, response_1.sendSuccess)(res, { isShippingEnabled: isEnabled });
}));
exports.default = router;
//# sourceMappingURL=shop.routes.js.map