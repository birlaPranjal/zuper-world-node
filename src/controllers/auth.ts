import { Request, Response } from 'express';
import { prisma } from '../index';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';

// Types
type UserCreateData = {
  name: string;
  email: string;
  password: string;
  qualification: string;
  description?: string;
  phone: string;
  role: Role;
};

type UserLoginData = {
  email: string;
  password: string;
};

type UserUpdatePasswordData = {
  userId: string;
  currentPassword: string;
  newPassword: string;
};

type UserUpdateProfileData = {
  userId: string;
  name?: string;
  email?: string;
  qualification?: string;
  description?: string;
  phone?: string;
};

// Controller functions
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, qualification, description, phone, role = 'ARMY_MEMBER' } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        name,
        email,
        password, // Note: In a real app, you should hash this password
        qualification,
        description: description || null,
        phone,
        role: role as Role,
        updatedAt: new Date()
      }
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Check if user exists and password matches
    if (!user || user.password !== password) { // Note: In a real app, you should compare hashed passwords
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
};

export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Check if user exists and current password matches
    if (!user || user.password !== currentPassword) {
      res.status(401).json({ error: 'Invalid current password' });
      return;
    }

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: newPassword, // Note: In a real app, you should hash this password
        updatedAt: new Date()
      }
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, ...updateData } = req.body;
    
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    // Return updated user data without password
    const { password, ...userWithoutPassword } = updatedUser;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Get user by ID
    const user = await prisma.user.findUnique({
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
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve user data' });
  }
}; 