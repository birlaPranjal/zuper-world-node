import { Request as ExpressRequest, Response } from 'express';
import { prisma } from '../index';
import { randomUUID } from 'crypto';
import Razorpay from 'razorpay';
import { 
  sendRegistrationPendingEmail, 
  sendRegistrationApprovedEmail, 
  sendRegistrationRejectedEmail 
} from '../utils/emailService';

// Extend the Express Request type to include our custom properties
interface Request extends ExpressRequest {
  body: any;
  headers: {
    'user-id'?: string;
    'x-user-role'?: string;
    [key: string]: string | string[] | undefined;
  };
  params: {
    [key: string]: string;
  };
  query: {
    [key: string]: string | string[] | undefined;
  };
}

// Types
type EventParticipantCreateData = {
  userId: string;
  eventId: string;
  notes?: string;
  paymentId?: string;
};

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_pQLbxWbQ5iwwZe',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'htb3dEruoc4vtPVNr6Pvu7i0'
});

// Controller functions
export const createEventParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, eventId, notes, paymentId } = req.body;
    console.log('paymentId', paymentId);
    console.log('userId', userId);
    console.log('eventId', eventId);
    console.log('notes', notes);
    // Validate required fields
    if (!userId || !eventId) {
      res.status(400).json({ error: 'User ID and Event ID are required' });
      return;
    }
    
    try {
      // Check if user exists
      console.log('route hit');
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          _count: {
            select: {
              EventParticipant: true
            }
          }
        }
      });

      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      // Check if event is full
      if (event._count.EventParticipant >= event.capacity) {
        res.status(400).json({ error: 'Event is at full capacity' });
        return;
      }

      // Check if user is already registered
      const existingRegistration = await prisma.eventParticipant.findUnique({
        where: {
          userId_eventId: {
            userId,
            eventId
          }
        }
      });

      if (existingRegistration) {
        res.status(400).json({ error: 'User is already registered for this event' });
        return;
      }

      // If event is not free and no payment ID is provided, create a payment order
      if (event.ticketPrice > 0 && !paymentId) {
        try {
          console.log('payment event not free');
          // Generate a shorter receipt ID (must be <= 40 chars)
          const shortEventId = eventId.substring(0, 4);
          const shortUserId = userId.substring(0, 4);
          const timestamp = Date.now().toString().substring(0, 8);
          const receiptId = `r_${shortEventId}${shortUserId}${timestamp}`;
          
          console.log('Receipt ID length:', receiptId.length, 'Receipt ID:', receiptId);
          
          const order = await razorpay.orders.create({
            amount: event.ticketPrice * 100, // Amount in smallest currency unit (paise for INR)
            currency: 'INR',
            receipt: receiptId,
            notes: {
              eventId: eventId,
              userId: userId
            }
          });

          res.status(200).json({ 
            requiresPayment: true, 
            order: order,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_pQLbxWbQ5iwwZe'
          });
          return;
        } catch (razorpayError) {
          console.error('Razorpay order creation error:', razorpayError);
          res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
          return;
        }
      }

      // For free events or if payment is completed
      // Create new event participant
      try {
        console.log('paymentId', paymentId);
        console.log('userId', userId);
        console.log('eventId', eventId);
        console.log('notes', notes);
        console.log('route hit');
        
        // If payment ID is provided, create a payment record first
        let paymentRecord = null;
        if (paymentId) {
          // Check if payment already exists
          const existingPayment = await prisma.payment.findUnique({
            where: { paymentId: paymentId }
          });
          
          if (existingPayment) {
            paymentRecord = existingPayment;
          } else {
            // Create a new payment record
            paymentRecord = await prisma.payment.create({
              data: {
                id: randomUUID(),
                amount: event.ticketPrice,
                currency: 'INR',
                status: 'COMPLETED',
                paymentId: paymentId,
                updatedAt: new Date(),
                userId: userId,
                eventId: eventId
              }
            });
          }
        }
        
        const newEventParticipant = await prisma.eventParticipant.create({
          data: {
            id: randomUUID(),
            userId,
            eventId,
            notes: notes || null,
            status: event.requireApproval ? 'PENDING' : 'APPROVED',
            updatedAt: new Date(),
            paymentId: paymentRecord ? paymentRecord.id : null
          },
          include: {
            Event: {
              include: {
                User: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            },
            User: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        // If the event requires approval, send a pending notification email
        if (event.requireApproval) {
          const userEmail = newEventParticipant.User.email;
          const userName = newEventParticipant.User.name;
          const eventName = newEventParticipant.Event.name;
          
          // Send pending notification email
          await sendRegistrationPendingEmail(
            userEmail,
            userName,
            eventName
          );
          
          console.log(`Pending notification email sent to ${userEmail} for event ${eventName}`);
        }

        res.status(201).json(newEventParticipant);
      } catch (dbError) {
        console.error('Database error creating event participant:', dbError);
        res.status(500).json({ error: 'Failed to register for event. Database error.' });
        return;
      }
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      res.status(500).json({ error: 'Database operation failed. Please try again.' });
      return;
    }
  } catch (error) {
    console.error('Create event participant error:', error);
    res.status(500).json({ error: 'Failed to register for event. Please try again.' });
  }
};

export const getEventParticipants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, userId, status } = req.query;
    
    // Build filter conditions
    const whereCondition: any = {};
    
    if (eventId) {
      whereCondition.eventId = eventId as string;
    }
    
    if (userId) {
      whereCondition.userId = userId as string;
    }
    
    if (status) {
      whereCondition.status = status as string;
    }
    
    // Get event participants with filter
    const eventParticipants = await prisma.eventParticipant.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        Event: {
          include: {
            User: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(200).json(eventParticipants);
  } catch (error) {
    console.error('Get event participants error:', error);
    res.status(500).json({ error: 'Failed to retrieve event participants' });
  }
};

export const getEventParticipantById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Get event participant by ID
    const eventParticipant = await prisma.eventParticipant.findUnique({
      where: { id },
      include: {
        Event: {
          include: {
            User: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!eventParticipant) {
      res.status(404).json({ error: 'Event participant not found' });
      return;
    }

    res.status(200).json(eventParticipant);
  } catch (error) {
    console.error('Get event participant by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve event participant' });
  }
};

export const updateEventParticipantStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Check if event participant exists
    const existingEventParticipant = await prisma.eventParticipant.findUnique({
      where: { id },
      include: {
        Event: true,
        User: true
      }
    });

    if (!existingEventParticipant) {
      res.status(404).json({ error: 'Event participant not found' });
      return;
    }

    // Update event participant status
    const updatedEventParticipant = await prisma.eventParticipant.update({
      where: { id },
      data: {
        status,
        notes: notes || existingEventParticipant.notes,
        updatedAt: new Date()
      },
      include: {
        Event: {
          include: {
            User: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Send email notification based on status
    const userEmail = updatedEventParticipant.User.email;
    const userName = updatedEventParticipant.User.name;
    const eventName = updatedEventParticipant.Event.name;
    
    if (status === 'APPROVED') {
      const eventDate = new Date(updatedEventParticipant.Event.startDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const eventLocation = updatedEventParticipant.Event.location;
      
      // Check if event is offline (not containing "online", "virtual", "zoom", "teams", "meet" in location)
      const isOfflineEvent = !eventLocation.toLowerCase().match(/online|virtual|zoom|teams|meet|webinar|remote/);
      
      // Send approval email with QR code for offline events
      await sendRegistrationApprovedEmail(
        userEmail,
        userName,
        eventName,
        eventDate,
        eventLocation,
        isOfflineEvent,
        updatedEventParticipant.id
      );
      
      console.log(`Approval email sent to ${userEmail} for event ${eventName}${isOfflineEvent ? ' with QR code' : ''}`);
    } else if (status === 'REJECTED') {
      // Send rejection email
      await sendRegistrationRejectedEmail(
        userEmail,
        userName,
        eventName,
        notes || 'No specific reason provided.'
      );
      
      console.log(`Rejection email sent to ${userEmail} for event ${eventName}`);
    }

    res.status(200).json(updatedEventParticipant);
  } catch (error) {
    console.error('Update event participant status error:', error);
    res.status(500).json({ error: 'Failed to update event participant status' });
  }
};

export const deleteEventParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if event participant exists
    const existingEventParticipant = await prisma.eventParticipant.findUnique({
      where: { id }
    });

    if (!existingEventParticipant) {
      res.status(404).json({ error: 'Event participant not found' });
      return;
    }

    // Delete the event participant
    await prisma.eventParticipant.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Event participant deleted successfully' });
  } catch (error) {
    console.error('Delete event participant error:', error);
    res.status(500).json({ error: 'Failed to delete event participant' });
  }
}; 