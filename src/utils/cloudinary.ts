import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Check if Cloudinary environment variables are set
const isCloudinaryConfigured = 
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && 
  process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary if environment variables are set
if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  // Log Cloudinary configuration for debugging
  console.log('Cloudinary Configuration:', {
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ? '******' : undefined,
    api_secret: process.env.CLOUDINARY_API_SECRET ? '******' : undefined
  });
} else {
  console.warn('Cloudinary is not properly configured. File uploads will not work.');
}

/**
 * Upload a file to Cloudinary
 * @param filePath - Path to the file to upload
 * @param folder - Folder in Cloudinary to store the file
 * @returns Promise with upload result
 */
export const uploadToCloudinary = (filePath: string, folder: string) => {
  return new Promise<any>((resolve, reject) => {
    // Check if Cloudinary is properly configured
    if (!isCloudinaryConfigured) {
      // Delete the temporary file
      fs.unlink(filePath, (unlinkError) => {
        if (unlinkError) {
          console.error('Error deleting temporary file:', unlinkError);
        }
      });
      
      return reject(new Error('Cloudinary configuration is missing'));
    }

    cloudinary.uploader.upload(
      filePath,
      {
        folder: `zuper/${folder}`,
        resource_type: 'auto'
      },
      (error, result) => {
        // Delete the temporary file
        fs.unlink(filePath, (unlinkError) => {
          if (unlinkError) {
            console.error('Error deleting temporary file:', unlinkError);
          }
        });

        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        
        resolve(result);
      }
    );
  });
};

/**
 * Delete a file from Cloudinary
 * @param publicId - Public ID of the file to delete
 * @returns Promise with deletion result
 */
export const deleteFromCloudinary = (publicId: string) => {
  return new Promise<any>((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        return reject(error);
      }
      
      resolve(result);
    });
  });
}; 