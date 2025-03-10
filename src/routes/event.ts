import express, { Request, Response } from 'express';
import * as eventController from '../controllers/event';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Event routes
router.post('/events', eventController.createEvent);
router.get('/events', eventController.getEvents);
router.get('/events/:id', eventController.getEventById);
router.put('/events/:id', eventController.updateEvent);
router.delete('/events/:id', eventController.deleteEvent);

export default router; 