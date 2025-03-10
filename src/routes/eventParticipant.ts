import express, { Request, Response } from 'express';
import * as eventParticipantController from '../controllers/eventParticipant';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Event participant routes
router.post('/event-participants', eventParticipantController.createEventParticipant);
router.get('/event-participants', eventParticipantController.getEventParticipants);
router.get('/event-participants/:id', eventParticipantController.getEventParticipantById);
router.put('/event-participants/:id', eventParticipantController.updateEventParticipantStatus);
router.delete('/event-participants/:id', eventParticipantController.deleteEventParticipant);

export default router; 