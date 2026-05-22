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
        const userId = req.user?._id;
        if (!userId) {
            res.status(401).json({ status: "failure", message: "Unauthorized" });
            return;
        }

        // Querying with userId ensures users can only access their own documents
        const booking = await TravelBooking.findOne({ _id: bookingId, userId });

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
