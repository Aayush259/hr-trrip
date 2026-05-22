/**
 * @file gemini.ts
 * @description Gemini AI initialization and travel itinerary processing
 */

import { GoogleGenAI } from "@google/genai";
import envConfig from "../config/envConfig.js";
import { TravelBooking } from "../models/TravelBooking.js";

// Initialize Gemini SDK
const ai = new GoogleGenAI({ apiKey: envConfig.gemini_api_key });

/**
 * Extracts a JSON object or array from a string containing markdown blocks.
 */
const extractJSON = (text: string): any => {
    try {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonMatch && jsonMatch[1]) {
            return JSON.parse(jsonMatch[1].trim());
        }
        return JSON.parse(text.trim());
    } catch (error) {
        console.error(" => [LIB ERROR: gemini] Failed to parse JSON from AI response");
        throw new Error("Invalid JSON format from AI");
    }
};

/**
 * Processes a travel document buffer using Gemini AI to generate a structured itinerary.
 * 
 * @param bookingId - The ID of the TravelBooking document in MongoDB.
 * @param fileBuffer - The memory buffer of the uploaded file.
 * @param mimeType - The mime-type of the file (e.g., 'image/jpeg', 'application/pdf').
 */
export const processTravelDocument = async (
    bookingId: string,
    fileBuffer: Buffer | null,
    mimeType: string
): Promise<void> => {
    console.log(` => [LIB: gemini] Starting AI processing for booking ${bookingId}`);

    try {
        if (!fileBuffer) {
            throw new Error("File buffer is null or empty");
        }

        // Update status to processing
        await TravelBooking.findByIdAndUpdate(bookingId, { extractionStatus: "processing" });

        const prompt = `
            Analyze this travel document (such as a flight ticket, hotel booking, or travel itinerary).
            Extract all relevant details and generate a structured travel itinerary.
            Return ONLY a valid JSON object containing the structured itinerary. Do not include any conversational text or formatting outside of the JSON block.
            The JSON should ideally include fields like: 
            - title (string)
            - destination (string)
            - startDate (ISO date string)
            - endDate (ISO date string)
            - events (array of objects with time, description, location)

            You are allowed to add other fields that you think are relevant to the itinerary.
        `;

        console.log(` => [LIB: gemini] Sending document to Gemini AI for booking ${bookingId}`);

        // Call Gemini API
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: fileBuffer.toString("base64"),
                            },
                        },
                    ],
                },
            ],
        });

        // Explicitly clear buffer from memory to aid Garbage Collection
        fileBuffer = null;

        const responseText = response.text || "";
        console.log(` => [LIB: gemini] Received response from Gemini AI for booking ${bookingId}`);

        const structuredData = extractJSON(responseText);

        // Update the booking with completed data
        await TravelBooking.findByIdAndUpdate(bookingId, {
            extractionStatus: "completed",
            extractedData: structuredData,
        });

        console.log(` => [LIB: gemini] Successfully processed and saved itinerary for booking ${bookingId}`);
    } catch (error) {
        console.error(` => [LIB ERROR: gemini] Error processing booking ${bookingId}:`, error);

        // Explicitly clear buffer on error to prevent memory leaks
        fileBuffer = null;

        // Mark as failed in the database
        await TravelBooking.findByIdAndUpdate(bookingId, { extractionStatus: "failed" }).catch(err => {
            console.error(" => [LIB ERROR: gemini] Failed to update booking status to 'failed':", err);
        });
    }
};
