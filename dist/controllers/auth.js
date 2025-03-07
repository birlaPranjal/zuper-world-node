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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.updateProfile = exports.updatePassword = exports.login = exports.signup = void 0;
const index_1 = require("../index");
const crypto_1 = require("crypto");
// Controller functions
const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, qualification, description, phone, role = 'ARMY_MEMBER' } = req.body;
        // Check if user already exists
        const existingUser = yield index_1.prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            res.status(400).json({ error: 'User with this email already exists' });
            return;
        }
        // Create new user
        const newUser = yield index_1.prisma.user.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                name,
                email,
                password, // Note: In a real app, you should hash this password
                qualification,
                description: description || null,
                phone,
                role: role,
                updatedAt: new Date()
            }
        });
        // Return user data without password
        const { password: _ } = newUser, userWithoutPassword = __rest(newUser, ["password"]);
        res.status(201).json(userWithoutPassword);
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});
exports.signup = signup;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Find user by email
        const user = yield index_1.prisma.user.findUnique({
            where: { email }
        });
        // Check if user exists and password matches
        if (!user || user.password !== password) { // Note: In a real app, you should compare hashed passwords
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        // Return user data without password
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.status(200).json(userWithoutPassword);
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to authenticate' });
    }
});
exports.login = login;
const updatePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        // Find user
        const user = yield index_1.prisma.user.findUnique({
            where: { id: userId }
        });
        // Check if user exists and current password matches
        if (!user || user.password !== currentPassword) {
            res.status(401).json({ error: 'Invalid current password' });
            return;
        }
        // Update password
        yield index_1.prisma.user.update({
            where: { id: userId },
            data: {
                password: newPassword, // Note: In a real app, you should hash this password
                updatedAt: new Date()
            }
        });
        res.status(200).json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});
exports.updatePassword = updatePassword;
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { userId } = _a, updateData = __rest(_a, ["userId"]);
        // Update user profile
        const updatedUser = yield index_1.prisma.user.update({
            where: { id: userId },
            data: Object.assign(Object.assign({}, updateData), { updatedAt: new Date() })
        });
        // Return updated user data without password
        const { password } = updatedUser, userWithoutPassword = __rest(updatedUser, ["password"]);
        res.status(200).json(userWithoutPassword);
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
exports.updateProfile = updateProfile;
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Get user by ID
        const user = yield index_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                qualification: true,
                description: true,
                phone: true,
                createdAt: true,
                updatedAt: true,
                // Include counts of related data
                _count: {
                    select: {
                        Event: true,
                        EventParticipant: true,
                        Payment: true
                    }
                }
            }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.status(200).json(user);
    }
    catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({ error: 'Failed to retrieve user data' });
    }
});
exports.getUserById = getUserById;
