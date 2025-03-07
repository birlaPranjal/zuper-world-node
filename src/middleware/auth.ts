import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware to authenticate user based on userId in request
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required for authentication' });
    }
    
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(403).json({ error: 'Invalid user ID' });
    }
    
    // Initialize req.body if it doesn't exist
    if (!req.body) {
      req.body = {};
    }
    
    // Add user info to request body
    req.body.userId = user.id;
    req.body.userEmail = user.email;
    req.body.userRole = user.role;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user is an admin
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user role from multiple sources for reliability
    const headerUserRole = req.headers['x-user-role'] as string;
    const bodyUserRole = req.body.userRole;
    const userRole = req.body.userRole || bodyUserRole || headerUserRole;
    
    console.log('Checking admin role:', { 
      userRole,
      bodyUserRole,
      headerUserRole,
      userId: req.body.userId,
      headers: req.headers['user-id']
    });
    
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

// Middleware to check if user is an admin or guru
export const isAdminOrGuru = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = req.body.userRole;
    
    if (userRole !== 'ADMIN' && userRole !== 'GURU') {
      return res.status(403).json({ error: 'Access denied. Admin or Guru role required.' });
    }
    
    next();
  } catch (error) {
    console.error('Admin/Guru check error:', error);
    return res.status(500).json({ error: 'Failed to verify role status' });
  }
}; 