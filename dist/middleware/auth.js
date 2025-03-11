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
exports.isAdminOrGuru = exports.isAdmin = exports.authenticateToken = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Middleware to authenticate user based on userId in request
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({ error: 'User ID is required for authentication' });
        }
        // Verify user exists
        const user = yield prisma.user.findUnique({
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
    }
    catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
});
exports.authenticateToken = authenticateToken;
// Middleware to check if user is an admin
const isAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get user role from multiple sources for reliability
        const headerUserRole = req.headers['x-user-role'];
        const bodyUserRole = req.body.userRole;
        const userRole = req.body.userRole || bodyUserRole || headerUserRole;
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied. Admin role required.' });
        }
        next();
    }
    catch (error) {
        console.error('Admin check error:', error);
        return res.status(500).json({ error: 'Failed to verify admin status' });
    }
});
exports.isAdmin = isAdmin;
// Middleware to check if user is an admin or guru
const isAdminOrGuru = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userRole = req.body.userRole;
        if (userRole !== 'ADMIN' && userRole !== 'GURU') {
            return res.status(403).json({ error: 'Access denied. Admin or Guru role required.' });
        }
        next();
    }
    catch (error) {
        console.error('Admin/Guru check error:', error);
        return res.status(500).json({ error: 'Failed to verify role status' });
    }
});
exports.isAdminOrGuru = isAdminOrGuru;
