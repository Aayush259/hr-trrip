import express from "express";
import { getUserBookings, getBookingDetails } from "../controllers/bookingController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth middleware to all booking routes
router.use(authMiddleware);

// Get a list of all travel bookings (metadata only)
router.get("/", getUserBookings);

// Get detailed extracted data for a specific booking
router.get("/:id", getBookingDetails);

export default router;
