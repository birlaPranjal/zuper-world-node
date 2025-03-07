import { Request as ExpressRequest, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { uploadToCloudinary } from '../utils/cloudinary';
import { sendEmail } from '../utils/emailService';

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
  files?: any;
}

// Extend PrismaClient to include our models
interface ExtendedPrismaClient extends PrismaClient {
  guruApplication: any;
  successStory: any;
  user: any;
}

const prisma = new PrismaClient() as ExtendedPrismaClient;

// Submit a new guru application
export const submitGuruApplication = async (req: Request, res: Response) => {
  try {
    const { 
      fullName, 
      email, 
      phone, 
      expertise, 
      experience, 
      linkedin, 
      website, 
      bio, 
      motivation 
    } = req.body;
    
    const userId = req.body.userId;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user already has an application
    const existingApplication = await prisma.guruApplication.findUnique({
      where: { userId },
      select: { id: true }
    });
    
    if (existingApplication) {
      return res.status(400).json({ 
        error: 'You have already submitted an application',
        applicationId: existingApplication.id
      });
    }
    
    // Handle file uploads (resume and profile image)
    let resumeUrl = '';
    let profileImageUrl = '';
    let fileUploadError = null;
    
    // Use any type for files to bypass TypeScript checking
    const files = (req as any).files;
    
    try {
      if (files) {
        if (files.resume && files.resume.length > 0) {
          const resumeFile = files.resume[0];
          const resumeUploadResult = await uploadToCloudinary(resumeFile.path, 'resumes');
          resumeUrl = resumeUploadResult.secure_url;
        }
        
        if (files.profileImage && files.profileImage.length > 0) {
          const profileImageFile = files.profileImage[0];
          const profileImageUploadResult = await uploadToCloudinary(profileImageFile.path, 'profiles');
          profileImageUrl = profileImageUploadResult.secure_url;
        }
      }
    } catch (uploadError) {
      console.error('Error uploading files to Cloudinary:', uploadError);
      fileUploadError = uploadError;
      // Continue with application creation even if file uploads fail
    }
    
    // Create the application
    const application = await prisma.guruApplication.create({
      data: {
        fullName,
        email,
        phone,
        expertise: Array.isArray(expertise) ? expertise : [expertise],
        experience,
        linkedin,
        website,
        bio,
        motivation,
        resumeUrl,
        profileImageUrl,
        userId,
        status: 'PENDING'
      }
    });
    
    // Return success response with warning if file upload failed
    if (fileUploadError) {
      return res.status(201).json({
        message: 'Application submitted successfully, but file uploads failed',
        applicationId: application.id,
        warning: 'File uploads failed. You may need to update your files later.'
      });
    }
    
    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: application.id
    });
  } catch (error) {
    console.error('Error submitting guru application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
};

// Get all guru applications (admin only)
export const getAllApplications = async (req: Request, res: Response) => {
  try {
    const applications = await prisma.guruApplication.findMany({
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching guru applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// Get a specific guru application
export const getApplicationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const application = await prisma.guruApplication.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            qualification: true
          }
        }
      }
    });
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.status(200).json(application);
  } catch (error) {
    console.error('Error fetching guru application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
};

// Update application status (admin only)
export const updateApplicationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminId = req.body.userId; // The admin who is reviewing
    
    // Check if application exists
    const application = await prisma.guruApplication.findUnique({
      where: { id },
      include: {
        User: true
      }
    });
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Update application status
    const updatedApplication = await prisma.guruApplication.update({
      where: { id },
      data: {
        status,
        notes,
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });
    
    // If application is approved, update user role to GURU and send email
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: application.userId },
        data: { role: 'GURU' }
      });
      
      // Send approval email
      const emailSent = await sendGuruApplicationApprovedEmail(
        application.email,
        application.fullName
      );
      
      if (!emailSent) {
        console.error('Failed to send guru approval email to:', application.email);
      }
    } else if (status === 'REJECTED') {
      // Send rejection email
      const emailSent = await sendGuruApplicationRejectedEmail(
        application.email,
        application.fullName,
        notes
      );
      
      if (!emailSent) {
        console.error('Failed to send guru rejection email to:', application.email);
      }
    }
    
    res.status(200).json({
      message: `Application ${status.toLowerCase()}`,
      application: updatedApplication
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
};

// Helper functions for sending guru application emails
const sendGuruApplicationApprovedEmail = async (
  to: string,
  userName: string
): Promise<boolean> => {
  const subject = 'Your Zuper Guru Application Has Been Approved!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4F46E5;">Congratulations! You're Now a Zuper Guru</h2>
      <p>Hello ${userName},</p>
      <p>We're thrilled to inform you that your application to become a Zuper Guru has been <strong>approved</strong>!</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #4F46E5;">What's Next?</h3>
        <ul style="padding-left: 20px;">
          <li>Your account has been upgraded to Guru status</li>
          <li>You now have access to the Guru Dashboard</li>
          <li>You can create and share success stories</li>
          <li>You'll be invited to exclusive networking events</li>
        </ul>
      </div>
      
      <p>We're excited to have you join our community of experts and look forward to your valuable contributions!</p>
      
      <div style="margin-top: 20px;">
        <a href="${process.env.FRONTEND_URL}/guru/dashboard" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Access Your Guru Dashboard
        </a>
      </div>
      
      <p style="margin-top: 20px;">If you have any questions, please don't hesitate to contact us.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
  `;
  
  return sendEmail(to, subject, html);
};

const sendGuruApplicationRejectedEmail = async (
  to: string,
  userName: string,
  reason?: string
): Promise<boolean> => {
  const subject = 'Update on Your Zuper Guru Application';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4F46E5;">Zuper Guru Application Update</h2>
      <p>Hello ${userName},</p>
      <p>Thank you for your interest in becoming a Zuper Guru. After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
      
      ${reason ? `
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #4F46E5;">Feedback from our team:</h3>
        <p>${reason}</p>
      </div>
      ` : ''}
      
      <p>We encourage you to apply again in the future as you gain more experience or if your circumstances change.</p>
      
      <p>If you have any questions or would like more information, please don't hesitate to contact us.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
  `;
  
  return sendEmail(to, subject, html);
};

// Create a success story (guru only)
export const createSuccessStory = async (req: Request, res: Response) => {
  try {
    const { 
      founderName, 
      companyName, 
      industry, 
      shortDescription, 
      fullStory, 
      achievements, 
      testimonial 
    } = req.body;
    
    // Get userId from headers if not in body
    const userId = req.body.userId || req.headers['user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    // Check if user exists and is a guru
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role !== 'GURU' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only gurus can create success stories' });
    }
    
    // Handle image upload
    let imageUrl = '';
    
    // Use any type for files to bypass TypeScript checking
    const files = (req as any).files;
    
    if (files && files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      const imageUploadResult = await uploadToCloudinary(imageFile.path, 'success-stories');
      imageUrl = imageUploadResult.secure_url;
    }
    
    // Create the success story
    const successStory = await prisma.successStory.create({
      data: {
        founderName,
        companyName,
        industry,
        imageUrl,
        shortDescription,
        fullStory,
        achievements: Array.isArray(achievements) ? achievements : [achievements],
        testimonial,
        isPublished: user.role === 'ADMIN', // Auto-publish if admin creates it
        userId
      }
    });
    
    res.status(201).json({
      message: 'Success story created successfully',
      storyId: successStory.id,
      isPublished: successStory.isPublished
    });
  } catch (error) {
    console.error('Error creating success story:', error);
    res.status(500).json({ error: 'Failed to create success story' });
  }
};

// Get all success stories
export const getAllSuccessStories = async (req: Request, res: Response) => {
  try {
    const { published } = req.query;
    
    // Filter by published status if specified
    const where = published === 'true' ? { isPublished: true } : {};
    
    const successStories = await prisma.successStory.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json(successStories);
  } catch (error) {
    console.error('Error fetching success stories:', error);
    res.status(500).json({ error: 'Failed to fetch success stories' });
  }
};

// Get a specific success story
export const getSuccessStoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching success story with ID:', id);
    
    // Try to find the story by ID first
    let successStory = await prisma.successStory.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    // If not found and the ID is short (might be a slug part), try to find stories with IDs ending with this string
    if (!successStory && id && id.length < 36) {
      console.log('Story not found by exact ID, trying partial match');
      const stories = await prisma.successStory.findMany({
        where: {
          id: {
            endsWith: id
          }
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });
      
      if (stories.length === 1) {
        successStory = stories[0];
        console.log('Found story by partial ID match:', successStory.id);
      } else if (stories.length > 1) {
        console.log(`Found ${stories.length} stories with ID ending in ${id}, using first one`);
        successStory = stories[0];
      }
    }
    
    if (!successStory) {
      console.log('Success story not found with ID:', id);
      return res.status(404).json({ error: 'Success story not found' });
    }
    
    // If story is not published, only allow admin or the creator to view it
    if (!successStory.isPublished) {
      const userId = req.body.userId || req.headers['user-id'];
      const userRole = req.body.userRole;
      
      console.log('Checking permissions for unpublished story:', {
        storyUserId: successStory.userId,
        requestUserId: userId,
        userRole
      });
      
      if (userId !== successStory.userId && userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'You do not have permission to view this story' });
      }
    }
    
    res.status(200).json(successStory);
  } catch (error) {
    console.error('Error fetching success story:', error);
    res.status(500).json({ error: 'Failed to fetch success story' });
  }
};

// Update success story publication status (admin only)
export const updateSuccessStoryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPublished, userRole: bodyUserRole } = req.body;
    
    // Get user role from multiple sources for reliability
    const headerUserRole = req.headers['x-user-role'] as string;
    const userRole = req.body.userRole || bodyUserRole || headerUserRole;
    
    console.log('Updating success story status:', { 
      id, 
      isPublished, 
      userId: req.body.userId,
      userRole,
      bodyUserRole,
      headerUserRole,
      headers: req.headers
    });
    
    // Check if story exists
    const story = await prisma.successStory.findUnique({
      where: { id }
    });
    
    if (!story) {
      console.log('Story not found:', id);
      return res.status(404).json({ error: 'Success story not found' });
    }
    
    // Verify user is admin
    if (userRole !== 'ADMIN') {
      console.log('Permission denied - not admin:', { userRole, bodyUserRole, headerUserRole });
      return res.status(403).json({ error: 'Only admins can publish/unpublish stories' });
    }
    
    // Update publication status
    const updatedStory = await prisma.successStory.update({
      where: { id },
      data: { 
        isPublished,
        updatedAt: new Date()
      }
    });
    
    console.log('Story updated successfully:', {
      id: updatedStory.id,
      isPublished: updatedStory.isPublished
    });
    
    res.status(200).json({
      message: isPublished ? 'Success story published' : 'Success story unpublished',
      story: updatedStory
    });
  } catch (error) {
    console.error('Error updating success story status:', error);
    res.status(500).json({ error: 'Failed to update success story status' });
  }
};

// Get success stories by user
export const getSuccessStoriesByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const successStories = await prisma.successStory.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json(successStories);
  } catch (error) {
    console.error('Error fetching user success stories:', error);
    res.status(500).json({ error: 'Failed to fetch user success stories' });
  }
};

// Get application by user
export const getApplicationByUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const application = await prisma.guruApplication.findUnique({
      where: { userId }
    });
    
    if (!application) {
      return res.status(404).json({ error: 'No application found for this user' });
    }
    
    res.status(200).json({ application });
  } catch (error) {
    console.error('Error fetching user application:', error);
    res.status(500).json({ error: 'Failed to fetch user application' });
  }
};

// Get story statistics for a user
export const getSuccessStoryStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Get total count
    const totalCount = await prisma.successStory.count({
      where: { userId }
    });
    
    // Get published count
    const publishedCount = await prisma.successStory.count({
      where: { 
        userId,
        isPublished: true
      }
    });
    
    // Get pending count (not published)
    const pendingCount = await prisma.successStory.count({
      where: { 
        userId,
        isPublished: false
      }
    });
    
    // For rejected, we would need to add a status field to the model
    // For now, we'll just return 0
    const rejectedCount = 0;
    
    res.status(200).json({
      total: totalCount,
      published: publishedCount,
      pending: pendingCount,
      rejected: rejectedCount
    });
  } catch (error) {
    console.error('Error fetching story statistics:', error);
    res.status(500).json({ error: 'Failed to fetch story statistics' });
  }
};

// Check if user has already submitted an application
export const checkUserApplication = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user already has an application
    const existingApplication = await prisma.guruApplication.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true
      }
    });
    
    return res.status(200).json({
      exists: !!existingApplication,
      application: existingApplication
    });
  } catch (error) {
    console.error('Error checking user application:', error);
    res.status(500).json({ error: 'Failed to check application status' });
  }
};

// Update a success story
export const updateSuccessStory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.headers['user-id'] as string;
    
    console.log('Updating success story with ID:', id);
    
    // Check if story exists
    const existingStory = await prisma.successStory.findUnique({
      where: { id },
      select: {
        userId: true,
        imageUrl: true
      }
    });
    
    if (!existingStory) {
      console.log('Story not found for update:', id);
      return res.status(404).json({ error: 'Success story not found' });
    }
    
    // Check if user is authorized to update this story
    if (existingStory.userId !== userId && req.body.userRole !== 'ADMIN') {
      console.log('Unauthorized update attempt:', {
        storyUserId: existingStory.userId,
        requestUserId: userId,
        userRole: req.body.userRole
      });
      return res.status(403).json({ error: 'You do not have permission to update this story' });
    }
    
    // Extract data from request
    const { 
      founderName, 
      companyName, 
      industry, 
      shortDescription, 
      fullStory, 
      achievements, 
      testimonial 
    } = req.body;
    
    // Handle image upload
    let imageUrl = existingStory.imageUrl;
    
    // Use any type for files to bypass TypeScript checking
    const files = (req as any).files;
    
    if (files && files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      const imageUploadResult = await uploadToCloudinary(imageFile.path, 'success-stories');
      imageUrl = imageUploadResult.secure_url;
    }
    
    // Parse achievements if it's a string
    let parsedAchievements = achievements;
    if (typeof achievements === 'string') {
      try {
        parsedAchievements = JSON.parse(achievements);
      } catch (e) {
        parsedAchievements = [achievements];
      }
    }
    
    // Update the success story
    const updatedStory = await prisma.successStory.update({
      where: { id },
      data: {
        founderName,
        companyName,
        industry,
        shortDescription,
        fullStory,
        achievements: parsedAchievements,
        testimonial,
        imageUrl,
        updatedAt: new Date()
      }
    });
    
    console.log('Success story updated:', id);
    res.status(200).json(updatedStory);
  } catch (error) {
    console.error('Error updating success story:', error);
    res.status(500).json({ error: 'Failed to update success story' });
  }
}; 