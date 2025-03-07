"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEvent = exports.updateEvent = exports.getEventById = exports.getEvents = exports.createEvent = void 0;
const index_1 = require("../index");
const crypto_1 = require("crypto");
// Controller functions
const createEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventData = req.body;
        // Create new event
        const newEvent = yield index_1.prisma.event.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
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
    }
    catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});
exports.createEvent = createEvent;
const getEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { creatorId, isPublished } = req.query;
        // Build filter conditions
        const whereCondition = {};
        if (creatorId) {
            whereCondition.creatorId = creatorId;
        }
        if (isPublished !== undefined) {
            whereCondition.isPublished = isPublished === 'true';
        }
        // Get events with filter
        const events = yield index_1.prisma.event.findMany({
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
    }
    catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Failed to retrieve events' });
    }
});
exports.getEvents = getEvents;
const getEventById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Get event by ID
        const event = yield index_1.prisma.event.findUnique({
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
    }
    catch (error) {
        console.error('Get event by ID error:', error);
        res.status(500).json({ error: 'Failed to retrieve event' });
    }
});
exports.getEventById = getEventById;
const updateEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = req.body;
        // Check if event exists
        const existingEvent = yield index_1.prisma.event.findUnique({
            where: { id }
        });
        if (!existingEvent) {
            res.status(404).json({ error: 'Event not found' });
            return;
        }
        // Prepare data for update
        const dataToUpdate = Object.assign(Object.assign({}, updateData), { updatedAt: new Date() });
        // Convert date strings to Date objects if provided
        if (updateData.startDate) {
            dataToUpdate.startDate = new Date(updateData.startDate);
        }
        if (updateData.endDate) {
            dataToUpdate.endDate = new Date(updateData.endDate);
        }
        // Update event
        const updatedEvent = yield index_1.prisma.event.update({
            where: { id },
            data: dataToUpdate
        });
        res.status(200).json(updatedEvent);
    }
    catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});
exports.updateEvent = updateEvent;
const deleteEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if event exists
        const existingEvent = yield index_1.prisma.event.findUnique({
            where: { id }
        });
        if (!existingEvent) {
            res.status(404).json({ error: 'Event not found' });
            return;
        }
        // Delete related event participants first (to handle foreign key constraints)
        yield index_1.prisma.eventParticipant.deleteMany({
            where: { eventId: id }
        });
        // Delete related payments
        yield index_1.prisma.payment.deleteMany({
            where: { eventId: id }
        });
        // Delete the event
        yield index_1.prisma.event.delete({
            where: { id }
        });
        res.status(200).json({ message: 'Event deleted successfully' });
    }
    catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});
exports.deleteEvent = deleteEvent;
