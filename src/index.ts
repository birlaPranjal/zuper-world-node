import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import eventRoutes from './routes/event';
import eventParticipantRoutes from './routes/eventParticipant';
import guruRoutes from './routes/guru';
import * as authController from './controllers/auth';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Log environment variables for debugging (without exposing secrets)
console.log('Environment Variables Loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '******' : undefined,
  CLOUDINARY_CONFIG: {
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ? '******' : undefined,
    api_secret: process.env.CLOUDINARY_API_SECRET ? '******' : undefined
  }
});

// Create Express app
const app = express();
const port = process.env.PORT || 3005;

// Initialize Prisma client
export const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', eventRoutes);
app.use('/api/guru', guruRoutes);

// Add a direct login route for backward compatibility
app.post('/api/login', (req: Request, res: Response) => {
  // Forward the request to the auth login route
  authController.login(req as any, res);
});

// Make sure event participant routes are registered correctly
// Register the routes directly at the root level to handle all variations
app.use(eventParticipantRoutes);

// Also register them explicitly at the /api path to ensure they're accessible
app.use('/api', eventParticipantRoutes);

// Debug route to check if the server is receiving requests
app.get('/api/debug', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Debug endpoint reached' });
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Event routes registered at /api/...`);
  console.log(`Event participant routes registered at /api/event-participants and /event-participants`);
  console.log(`Guru routes registered at /api/guru/...`);
});

// Handle Prisma connection on shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
}); 