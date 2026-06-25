"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageService = exports.imageService = void 0;
/**
 * Backward-compatibility facade. All image I/O is handled by SupabaseImageService.
 * Cloudinary is temporarily disabled.
 */
var supabase_image_service_1 = require("./supabase-image.service");
Object.defineProperty(exports, "imageService", { enumerable: true, get: function () { return supabase_image_service_1.supabaseImageService; } });
Object.defineProperty(exports, "ImageService", { enumerable: true, get: function () { return supabase_image_service_1.SupabaseImageService; } });
//# sourceMappingURL=image.service.js.map