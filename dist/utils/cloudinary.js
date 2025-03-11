"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
// Check if Cloudinary environment variables are set
const isCloudinaryConfigured = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;
// Configure Cloudinary if environment variables are set
if (isCloudinaryConfigured) {
    cloudinary_1.v2.config({
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
}
else {
    console.warn('Cloudinary is not properly configured. File uploads will not work.');
}
/**
 * Upload a file to Cloudinary
 * @param filePath - Path to the file to upload
 * @param folder - Folder in Cloudinary to store the file
 * @returns Promise with upload result
 */
const uploadToCloudinary = (filePath, folder) => {
    return new Promise((resolve, reject) => {
        // Check if Cloudinary is properly configured
        if (!isCloudinaryConfigured) {
            // Delete the temporary file
            fs_1.default.unlink(filePath, (unlinkError) => {
                if (unlinkError) {
                    console.error('Error deleting temporary file:', unlinkError);
                }
            });
            return reject(new Error('Cloudinary configuration is missing'));
        }
        cloudinary_1.v2.uploader.upload(filePath, {
            folder: `zuper/${folder}`,
            resource_type: 'auto'
        }, (error, result) => {
            // Delete the temporary file
            fs_1.default.unlink(filePath, (unlinkError) => {
                if (unlinkError) {
                    console.error('Error deleting temporary file:', unlinkError);
                }
            });
            if (error) {
                console.error('Cloudinary upload error:', error);
                return reject(error);
            }
            resolve(result);
        });
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
/**
 * Delete a file from Cloudinary
 * @param publicId - Public ID of the file to delete
 * @returns Promise with deletion result
 */
const deleteFromCloudinary = (publicId) => {
    return new Promise((resolve, reject) => {
        cloudinary_1.v2.uploader.destroy(publicId, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
    });
};
exports.deleteFromCloudinary = deleteFromCloudinary;
