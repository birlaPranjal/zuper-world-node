import express, { Request, Response } from 'express';
import * as guruController from '../controllers/guruController';
import { authenticateToken, isAdmin, isAdminOrGuru } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Guru Application Routes
router.post(
  '/applications', 
  authenticateToken, 
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 }
  ]),
  guruController.submitGuruApplication
);

router.get(
  '/applications',
  authenticateToken,
  isAdmin,
  guruController.getAllApplications
);

router.get(
  '/applications/:id',
  authenticateToken,
  guruController.getApplicationById
);

router.get(
  '/applications/user/:userId',
  authenticateToken,
  guruController.getApplicationByUser
);

router.get(
  '/applications/user/:userId/check',
  authenticateToken,
  guruController.checkUserApplication
);

router.patch(
  '/applications/:id/status',
  authenticateToken,
  isAdmin,
  guruController.updateApplicationStatus
);

// Success Story Routes
router.post(
  '/success-stories',
  authenticateToken,
  isAdminOrGuru,
  upload.fields([{ name: 'image', maxCount: 1 }]),
  guruController.createSuccessStory
);

router.get(
  '/success-stories',
  guruController.getAllSuccessStories
);

// User-specific routes must come before the :id route to avoid conflicts
router.get(
  '/success-stories/user/:userId',
  authenticateToken,
  guruController.getSuccessStoriesByUser
);

router.get(
  '/success-stories/user/:userId/stats',
  authenticateToken,
  guruController.getSuccessStoryStats
);

// Individual story routes
router.get(
  '/success-stories/:id',
  guruController.getSuccessStoryById
);

router.put(
  '/success-stories/:id',
  authenticateToken,
  isAdminOrGuru,
  upload.fields([{ name: 'image', maxCount: 1 }]),
  guruController.updateSuccessStory
);

router.patch(
  '/success-stories/:id/publish',
  authenticateToken,
  isAdmin,
  guruController.updateSuccessStoryStatus
);

export default router; 