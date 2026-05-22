/**
 * @file cloudinaryConfig.ts
 * @description Cloudinary SDK configuration and upload utilities
 */

import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import envConfig from "../config/envConfig.js";

// Configure Cloudinary with environment variables from the Config layer
cloudinary.config({
    cloud_name: envConfig.cloudinary_cloud_name,
    api_key: envConfig.cloudinary_api_key,
    api_secret: envConfig.cloudinary_api_secret,
});

/**
 * Uploads a file buffer (blob) directly to Cloudinary via a stream.
 * Ideal for `multer` configurations using memoryStorage.
 * 
 * @param fileBuffer - The file buffer.
 * @param originalName - Optional original filename.
 * @returns Cloudinary upload response object.
 */
export const uploadBufferToCloudinary = (fileBuffer: Buffer, originalName?: string): Promise<UploadApiResponse> => {
    return new Promise((resolve, reject) => {
        const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
        if (fileBuffer.length > MAX_SIZE) {
            console.warn(" => [LIB: cloudinary] Buffer exceeds 2MB limit");
            return reject(new Error("File size exceeds the 2MB limit"));
        }

        console.log(" => [LIB: cloudinary] Uploading file from memory buffer");
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: envConfig.cloudinary_folder || "hr-trrip",
                resource_type: "auto",
                ...(originalName && { public_id: originalName.split('.')[0] }),
            },
            (error, result) => {
                if (error) {
                    console.error(" => [LIB ERROR: cloudinary] Buffer upload failed:", error);
                    return reject(new Error("Failed to upload file to Cloudinary"));
                }
                if (result) {
                    console.log(` => [LIB: cloudinary] Buffer uploaded successfully. URL: ${result.secure_url}`);
                    return resolve(result);
                }
            }
        );
        uploadStream.end(fileBuffer);
    });
};
