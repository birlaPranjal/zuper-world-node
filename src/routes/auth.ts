import express, { Request, Response } from 'express';
import * as authController from '../controllers/auth';

const router = express.Router();

// Auth routes
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/update-password', authController.updatePassword);
router.post('/update-profile', authController.updateProfile);
router.get('/users/:id', authController.getUserById);

// Add a route to check authentication status
router.get('/check-auth', (req: Request, res: Response) => {
  // If the request reaches here, it means authentication was successful
  res.status(200).json({ authenticated: true });
});

export default router; 