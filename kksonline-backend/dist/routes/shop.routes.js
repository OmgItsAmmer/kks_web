import { Router } from 'express';
import { shopRepository } from '../repositories/shop.repository.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { sendSuccess } from '../utils/response.js';
const router = Router();
/**
 * @route   GET /api/v1/shop/config
 * @desc    Get shop configuration
 * @access  Public
 */
router.get('/config', asyncHandler(async (req, res) => {
    const config = await shopRepository.getConfig();
    if (!config) {
        return sendSuccess(res, {
            isShippingEnabled: false,
            maxAllowedQuantity: 50,
            taxRate: 0,
            shippingPrice: 0,
            freeShippingThreshold: null,
        });
    }
    return sendSuccess(res, {
        shopName: config.shopname,
        isShippingEnabled: config.is_shipping_enable,
        maxAllowedQuantity: Number(config.max_allowed_item_quantity),
        taxRate: Number(config.taxrate),
        shippingPrice: Number(config.shipping_price),
        freeShippingThreshold: config.threshold_free_shipping ? Number(config.threshold_free_shipping) : null,
    });
}));
/**
 * @route   GET /api/v1/shop/app-version
 * @desc    Get latest app version info
 * @access  Public
 */
router.get('/app-version', asyncHandler(async (req, res) => {
    const version = await shopRepository.getLatestAppVersion();
    if (!version) {
        return sendSuccess(res, {
            version: null,
            forceUpdate: false,
            appLocked: false,
        });
    }
    return sendSuccess(res, {
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
router.post('/check-version', asyncHandler(async (req, res) => {
    const { currentVersion } = req.body;
    if (!currentVersion || typeof currentVersion !== 'string') {
        return sendSuccess(res, {
            updateRequired: false,
            forceUpdate: false,
            isLocked: false,
        });
    }
    const result = await shopRepository.checkAppVersion(currentVersion);
    return sendSuccess(res, result);
}));
/**
 * @route   GET /api/v1/shop/shipping-enabled
 * @desc    Check if shipping is enabled
 * @access  Public
 */
router.get('/shipping-enabled', asyncHandler(async (req, res) => {
    const isEnabled = await shopRepository.isShippingEnabled();
    return sendSuccess(res, { isShippingEnabled: isEnabled });
}));
export default router;
//# sourceMappingURL=shop.routes.js.map