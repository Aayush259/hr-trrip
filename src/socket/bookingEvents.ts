/**
 * @file bookingEvents.ts
 * @description Handles Socket.IO events related to travel booking uploads and AI processing.
 */

import { Server, Socket } from "socket.io";
import { uploadBufferToCloudinary } from "../lib/cloudinaryConfig.js";
import { processTravelDocument } from "../lib/gemini.js";
import { TravelBooking } from "../models/TravelBooking.js";
import { SocketData } from "./index.js";

export const setupBookingEvents = (io: Server, socket: Socket<any, any, any, SocketData>) => {
    /**
     * Event: upload_travel_document
     * Flow:
     * 1. Validate 2MB limit and Memory Buffer directly.
     * 2. Upload to Cloudinary via buffer.
     * 3. Create MongoDB record ("pending").
     * 4. Call Gemini processing ("processing" -> "completed").
     * 5. Emit final extracted data back to the user's specific room.
     */
    socket.on("upload_travel_document", async (data: { fileBuffer: Buffer | ArrayBuffer, mimeType: string, filename?: string }) => {
        const userId = socket.data.user?._id?.toString();
        if (!userId) return;

        console.log(` => [SOCKET: bookingEvents] Received travel document upload request from user ${userId}`);

        try {
            // Memory optimization: Immediately extract buffer and destroy the original reference in payload
            let buffer = Buffer.isBuffer(data.fileBuffer) ? data.fileBuffer : Buffer.from(data.fileBuffer as ArrayBuffer);
            const { mimeType, filename } = data;
            
            // Allow Garbage Collection to reclaim the event payload reference
            data.fileBuffer = null as any; 

            // Strict 2MB Limit verification at the very edge
            const MAX_SIZE = 2 * 1024 * 1024;
            if (buffer.length > MAX_SIZE) {
                console.warn(` => [SOCKET: bookingEvents] File exceeds strictly enforced 2MB limit for user ${userId}`);
                buffer = null as any; // Free memory immediately
                io.to(userId).emit("travel_document_error", { message: "File exceeds the 2MB size limit." });
                return;
            }

            // Emit initial status
            io.to(userId).emit("travel_document_status", { status: "uploading", message: "Uploading document to secure storage..." });
            
            // 1. Upload to Cloudinary
            console.log(` => [SOCKET: bookingEvents] Uploading document to Cloudinary for user ${userId}`);
            const cloudinaryResult = await uploadBufferToCloudinary(buffer, filename);
            const documentUrl = cloudinaryResult.secure_url;

            // 2. Create TravelBooking record
            const travelBooking = new TravelBooking({
                userId,
                documentUrl,
                extractionStatus: "pending"
            });
            await travelBooking.save();
            const bookingId = travelBooking._id.toString();

            // 3. Call Gemini AI
            io.to(userId).emit("travel_document_status", { status: "processing", message: "AI is extracting itinerary details..." });
            
            console.log(` => [SOCKET: bookingEvents] Triggering Gemini AI processing for booking ${bookingId}`);
            // Wait for processing to complete. The gemini lib will automatically free the buffer reference.
            await processTravelDocument(bookingId, buffer, mimeType);
            
            // Ensure local scope buffer reference is also destroyed
            buffer = null as any;

            // 4. Fetch final updated data
            const updatedBooking = await TravelBooking.findById(bookingId);

            if (updatedBooking?.extractionStatus === "completed") {
                console.log(` => [SOCKET: bookingEvents] AI processing successful. Emitting results to user ${userId}`);
                io.to(userId).emit("travel_document_completed", {
                    status: "success",
                    message: "Itinerary successfully extracted!",
                    data: { booking: updatedBooking }
                });
            } else {
                console.error(` => [SOCKET: bookingEvents] AI processing failed for booking ${bookingId}`);
                io.to(userId).emit("travel_document_error", { message: "AI failed to parse the document into an itinerary." });
            }

        } catch (error) {
            console.error(` => [SOCKET ERROR: bookingEvents] Error handling document upload for user ${userId}:`, error);
            io.to(userId).emit("travel_document_error", { message: "An unexpected error occurred during processing." });
        }
    });
};
