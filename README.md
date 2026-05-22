# hr-trrip Backend

A robust Node.js/Express backend for the **hr-trrip** platform. This service is designed to seamlessly process user travel documents (flight tickets, hotel bookings, etc.), extract structured itineraries using Google's Gemini AI, and stream real-time progression updates directly to the frontend via WebSockets.

## 🚀 Key Features

- **AI Document Extraction**: Upload PDFs or images of unstructured travel documents. The system leverages the `@google/genai` SDK and **Gemini 2.5 Flash** to automatically parse and extract a clean, structured JSON itinerary.
- **Real-Time WebSockets**: Built-in Socket.IO integration emits live status updates (`uploading`, `processing`, `completed`) back to the specific user's room, avoiding inefficient HTTP polling.
- **JWT Authentication**: Secure user registration, login, and session management using short-lived Access Tokens and long-lived Refresh Tokens stored in HTTP-only cookies.
- **Cloud Storage**: Safely hosts raw documents on Cloudinary, enforcing strict 2MB memory and payload size limits before upload.
- **Optimized Data Fetching**: Distinct API endpoints for lightweight booking history lists (excluding heavy AI payloads) versus detailed itinerary views.
- **Standardized Logging**: Employs a highly readable `=> [MODULE: function]` logging format across controllers and middlewares for tracing and debugging.

## 🛠 Tech Stack

- **Node.js & Express**: Core server framework
- **TypeScript**: Strict type safety and compilation
- **MongoDB & Mongoose**: NoSQL Database & ORM
- **Socket.IO**: Real-time, bidirectional, event-based communication
- **Cloudinary**: Remote asset storage
- **@google/genai**: Next-generation Gemini AI integration
- **JWT & Bcrypt**: Cryptography and authentication

## 🏁 Getting Started

### Prerequisites

Ensure you have the following installed and configured:
- Node.js (v18 or higher)
- MongoDB Cluster
- Cloudinary Account
- Google Gemini API Key

### Environment Configuration

Create a `.env` file in the root directory and populate it with the following keys:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
MONGO_DATABASE=hr-trrip

# Authentication
JWT_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_FOLDER=hr-trrip

# Artificial Intelligence
GEMINI_API_KEY=your_google_gemini_api_key
```

### Installation

1. Install all required dependencies:
   ```bash
   npm install
   ```

2. Start the development server (uses `tsx` for hot-reloading):
   ```bash
   npm run dev
   ```

## 📡 API Reference

All API responses strictly follow the standardized structure: `{ status: "success" | "failure", message: string, data?: any }`.

### Authentication (`/api/users`)
- `POST /register`: Register a new user account.
- `POST /login`: Authenticate and receive an access token (refresh token stored in HttpOnly cookie).
- `POST /refresh-token`: Issue a new access token using a valid cookie.
- `POST /logout`: Clear the user's refresh token cookie.
- `GET /me`: Get current user profile (Requires Auth).

### Bookings (`/api/bookings`)
- `GET /`: Retrieve the authenticated user's booking history metadata (specifically excludes the heavy `extractedData` AI payload to reduce network latency).
- `GET /:id`: Retrieve the full, detailed document and generated AI itinerary for a specific booking.

## ⚡ Real-Time Socket Events

To use the live AI processing, connect to the Socket.IO server by passing the Access Token in the `Authorization: Bearer <token>` header or `auth: { token: "..." }`.

**Client Emits:**
- `upload_travel_document`: Starts the upload and AI processing workflow.
  - Payload: `{ fileBuffer: ArrayBuffer, mimeType: string, filename?: string }`

**Server Emits (to user's room):**
- `travel_document_status`: Live progress updates to render in the UI (e.g., `uploading` to secure storage, `processing` AI analysis).
- `travel_document_completed`: Emitted with the final `TravelBooking` model including the AI-extracted JSON itinerary.
- `travel_document_error`: Emitted if the file exceeds the 2MB memory limit, upload fails, or the AI fails to parse the document.
