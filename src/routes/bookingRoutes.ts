import express from "express";
import { getUserBookings, getBookingDetails, retryBookingExtraction } from "../controllers/bookingController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get a list of all travel bookings (metadata only)
router.get("/", authMiddleware, getUserBookings);

// Get detailed extracted data for a specific booking
router.get("/:id", getBookingDetails);

// Retry the AI extraction for a specific booking
router.post("/retry/:id", authMiddleware, retryBookingExtraction);

export default router;
