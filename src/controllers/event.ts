import { Request as ExpressRequest, Response } from 'express';
import { prisma } from '../index';
import { randomUUID } from 'crypto';

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
type EventCreateData = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  ticketPrice: number;
  capacity: number;
  imageUrl?: string;
  requireApproval?: boolean;
  isPublished?: boolean;
  creatorId: string;
};

type EventUpdateData = {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  ticketPrice?: number;
  capacity?: number;
  imageUrl?: string;
  requireApproval?: boolean;
  isPublished?: boolean;
};

// Controller functions
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventData: EventCreateData = req.body;
    
    // Create new event
    const newEvent = await prisma.event.create({
      data: {
        id: randomUUID(),
        name: eventData.name,
        description: eventData.description,
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        location: eventData.location,
        ticketPrice: eventData.ticketPrice,
        capacity: eventData.capacity,
        imageUrl: eventData.imageUrl || null,
        requireApproval: eventData.requireApproval || false,
        isPublished: eventData.isPublished || false,
        creatorId: eventData.creatorId,
        updatedAt: new Date()
      }
    });

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { creatorId, isPublished } = req.query;
    
    // Build filter conditions
    const whereCondition: any = {};
    
    if (creatorId) {
      whereCondition.creatorId = creatorId as string;
    }
    
    if (isPublished !== undefined) {
      whereCondition.isPublished = isPublished === 'true';
    }
    
    // Get events with filter
    const events = await prisma.event.findMany({
      where: whereCondition,
      orderBy: {
        startDate: 'asc'
      },
      include: {
        User: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            EventParticipant: true
          }
        }
      }
    });

    res.status(200).json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
};

export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Get event by ID
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            name: true,
            email: true
          }
        },
        EventParticipant: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.status(200).json(event);
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve event' });
  }
};

export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: EventUpdateData = req.body;
    
    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Prepare data for update
    const dataToUpdate: any = {
      ...updateData,
      updatedAt: new Date()
    };
    
    // Convert date strings to Date objects if provided
    if (updateData.startDate) {
      dataToUpdate.startDate = new Date(updateData.startDate);
    }
    
    if (updateData.endDate) {
      dataToUpdate.endDate = new Date(updateData.endDate);
    }

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: dataToUpdate
    });

    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Delete related event participants first (to handle foreign key constraints)
    await prisma.eventParticipant.deleteMany({
      where: { eventId: id }
    });
    
    // Delete related payments
    await prisma.payment.deleteMany({
      where: { eventId: id }
    });

    // Delete the event
    await prisma.event.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};
