import { Response } from "express";
import { TravelBooking } from "../models/TravelBooking.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

export const getUserBookings = async (req: AuthRequest, res: Response): Promise<void> => {
    console.log(` => [CONTROLLER: getUserBookings] Fetching history for user ${req.user?._id}`);
    try {
        const userId = req.user?._id;
        if (!userId) {
            res.status(401).json({ status: "failure", message: "Unauthorized" });
            return;
        }

        // Send only metadata by excluding the potentially large 'extractedData' field
        const bookings = await TravelBooking.find({ userId })
            .select("-extractedData")
            .sort({ createdAt: -1 });

        console.log(` => [CONTROLLER: getUserBookings] Successfully retrieved ${bookings.length} bookings`);
        res.status(200).json({
            status: "success",
            message: "Booking history retrieved successfully",
            data: { bookings }
        });
    } catch (error) {
        console.error(" => [CONTROLLER ERROR: getUserBookings] Internal error:", error);
        res.status(500).json({ status: "failure", message: "Internal server error" });
    }
};

export const getBookingDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    const bookingId = req.params.id;
    console.log(` => [CONTROLLER: getBookingDetails] Fetching details for booking ${bookingId}`);
    try {
        const booking = await TravelBooking.findOne({ _id: bookingId });

        if (!booking) {
            console.log(` => [CONTROLLER: getBookingDetails] Booking ${bookingId} not found or access denied`);
            res.status(404).json({ status: "failure", message: "Booking not found" });
            return;
        }

        console.log(` => [CONTROLLER: getBookingDetails] Successfully retrieved detailed data for booking ${bookingId}`);
        res.status(200).json({
            status: "success",
            message: "Booking details retrieved successfully",
            data: { booking }
        });
    } catch (error) {
        console.error(" => [CONTROLLER ERROR: getBookingDetails] Internal error:", error);
        res.status(500).json({ status: "failure", message: "Internal server error" });
    }
};

export const retryBookingExtraction = async (req: AuthRequest, res: Response): Promise<void> => {
    const bookingId = req.params.id;
    const userId = req.user?._id?.toString();

    console.log(` => [CONTROLLER: retryBookingExtraction] Retrying extraction for booking ${bookingId}`);

    try {
        if (!userId) {
            res.status(401).json({ status: "failure", message: "Unauthorized" });
            return;
        }

        // Verify the booking exists and belongs to the user
        const booking = await TravelBooking.findOne({ _id: bookingId, userId });

        if (!booking) {
            console.log(` => [CONTROLLER: retryBookingExtraction] Booking ${bookingId} not found or access denied`);
            res.status(404).json({ status: "failure", message: "Booking not found" });
            return;
        }

        // Respond immediately so the client isn't hanging on a long HTTP request
        res.status(200).json({ status: "success", message: "Retry initiated. Processing in background..." });

        // Run the AI processing as a background task
        (async () => {
            const io = req.app.get("io"); // Get Socket.IO instance attached to the Express app in index.ts
            try {
                // 1. Fetch file directly from Cloudinary
                io?.to(userId).emit("travel_document_status", { status: "uploading", message: "Fetching document from secure storage..." });

                const fetchRes = await fetch(booking.documentUrl);
                if (!fetchRes.ok) {
                    throw new Error("Failed to fetch document from Cloudinary");
                }

                const arrayBuffer = await fetchRes.arrayBuffer();
                let buffer = Buffer.from(arrayBuffer);
                const mimeType = fetchRes.headers.get("content-type") || "application/octet-stream";

                // 2. Process with Gemini
                io?.to(userId).emit("travel_document_status", { status: "processing", message: "AI is re-analyzing your document..." });

                const { processTravelDocument } = await import("../lib/gemini.js");
                await processTravelDocument(bookingId.toString(), buffer, mimeType);

                // Force memory clear
                buffer = null as any;

                // 3. Fetch the updated result
                const updatedBooking = await TravelBooking.findById(bookingId);

                // 4. Emit the final status back via WebSocket
                if (updatedBooking?.extractionStatus === "completed") {
                    console.log(` => [CONTROLLER: retryBookingExtraction] AI retry successful for ${bookingId}`);
                    io?.to(userId).emit("travel_document_completed", {
                        status: "success",
                        message: "Itinerary successfully extracted on retry!",
                        data: { booking: updatedBooking }
                    });
                } else {
                    console.error(` => [CONTROLLER: retryBookingExtraction] AI retry failed for booking ${bookingId}`);
                    io?.to(userId).emit("travel_document_error", { message: "AI failed to parse the document on retry." });
                }
            } catch (bgError) {
                console.error(` => [CONTROLLER ERROR: retryBookingExtraction] Background task error for ${bookingId}:`, bgError);
                await TravelBooking.findByIdAndUpdate(bookingId, { extractionStatus: "failed" }).catch(() => { });
                io?.to(userId).emit("travel_document_error", { message: "An unexpected error occurred during retry processing." });
            }
        })();

    } catch (error) {
        console.error(" => [CONTROLLER ERROR: retryBookingExtraction] Internal error:", error);
        if (!res.headersSent) {
            res.status(500).json({ status: "failure", message: "Internal server error" });
        }
    }
};
