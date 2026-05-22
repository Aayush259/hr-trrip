import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITravelBooking extends Document {
    userId: mongoose.Types.ObjectId;
    documentUrl: string;
    extractionStatus: "pending" | "processing" | "completed" | "failed";
    extractedData?: any; // This will hold the structured AI-generated itinerary data
    createdAt: Date;
    updatedAt: Date;
}

const travelBookingSchema = new Schema<ITravelBooking>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    documentUrl: {
        type: String,
        required: true,
    },
    extractionStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
    },
    extractedData: {
        type: Schema.Types.Mixed, // Using Mixed to flexibly store any JSON structure the AI outputs
        default: null,
    }
}, {
    timestamps: true,
});

export const TravelBooking: Model<ITravelBooking> = mongoose.models.TravelBooking || mongoose.model<ITravelBooking>("TravelBooking", travelBookingSchema, "travel_bookings");
