import { Router, type Response } from 'express';
import { customerRepository } from '../repositories/customer.repository';
import { imageService } from '../services/image.service';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { requireCustomer } from '../middleware/customer.middleware';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import type { CustomerRequest } from '../types/api.types';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * @route   GET /api/v1/customers/profile
 * @desc    Get current customer profile
 * @access  Private
 */
router.get(
  '/profile',
  requireCustomer,
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const customer = await customerRepository.findById(req.customerId);
    if (!customer) {
      return sendNotFound(res, 'Customer not found');
    }

    const profilePicture = await imageService.getMainImageUrl(req.customerId, 'customers');

    return sendSuccess(res, {
      customerId: customer.customer_id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phoneNumber: customer.phone_number,
      cnic: customer.cnic,
      gender: customer.gender,
      dob: customer.dob,
      createdAt: customer.created_at,
      profilePicture,
    });
  })
);

/**
 * @route   PUT /api/v1/customers/profile
 * @desc    Update customer profile
 * @access  Private
 */
router.put(
  '/profile',
  requireCustomer,
  validate({ body: schemas.customerUpdate }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { firstName, lastName, phoneNumber, cnic, gender, dob } = req.body;

    const updated = await customerRepository.updateProfile(req.customerId, {
      firstName,
      lastName,
      phoneNumber,
      cnic,
      gender,
      dob,
    });

    return sendSuccess(res, {
      customerId: updated.customer_id,
      email: updated.email,
      firstName: updated.first_name,
      lastName: updated.last_name,
      phoneNumber: updated.phone_number,
      cnic: updated.cnic,
      gender: updated.gender,
      dob: updated.dob,
    }, 'Profile updated successfully');
  })
);

/**
 * @route   POST /api/v1/customers/profile-picture
 * @desc    Upload/update profile picture
 * @access  Private
 */
router.post(
  '/profile-picture',
  requireCustomer,
  upload.single('image'),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }

    const result = await imageService.updateMainImage(
      req.file.buffer,
      'customers',
      req.customerId,
      req.file.originalname,
      req.file.mimetype
    );

    return sendSuccess(res, {
      imageUrl: result.url,
      imageId: result.imageId,
    }, 'Profile picture updated');
  })
);

/**
 * @route   DELETE /api/v1/customers/profile-picture
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete(
  '/profile-picture',
  requireCustomer,
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    await imageService.deleteMainImage(req.customerId, 'customers');

    return sendSuccess(res, null, 'Profile picture deleted');
  })
);

/**
 * @route   DELETE /api/v1/customers/account
 * @desc    Delete customer account
 * @access  Private
 */
router.delete(
  '/account',
  requireCustomer,
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    // Delete all related data first
    await imageService.deleteAllImagesForEntity(req.customerId, 'customers');
    
    // Delete customer record
    await customerRepository.delete(req.customerId);

    return sendSuccess(res, null, 'Account deleted successfully');
  })
);

export default router;
