/**
 * @file socketAuthMiddleware.ts
 * @description Authentication middleware for Socket.IO connections using JWT.
 * 
 * CORE CONCEPT:
 * This middleware secures the WebSocket layer. It ensures that real-time 
 * log streaming is only available to authenticated users by validating 
 * their JWT token before allowing the connection to upgrade.
 */

import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

/**
 * socketAuthMiddleware
 * Intercepts Socket.IO connection attempts and validates user sessions.
 */
export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
    console.log(` => [MIDDLEWARE: socketAuthMiddleware] Intercepting Socket.IO connection attempt from ${socket.id}`);
    try {
        // Support token from either socket.handshake.auth or headers
        let token = socket.handshake.auth?.token;

        if (!token && socket.handshake.headers?.authorization) {
            const authHeader = socket.handshake.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }
        }

        if (!token) {
            console.log(" => [MIDDLEWARE: socketAuthMiddleware] No token provided");
            return next(new Error("Unauthorized: No token provided"));
        }

        const secret = process.env.JWT_SECRET || "default_secret";
        const decoded = jwt.verify(token, secret) as { userId: string };

        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            console.log(" => [MIDDLEWARE: socketAuthMiddleware] User not found for token");
            return next(new Error("Unauthorized: User not found"));
        }

        // Attach user data to the socket for use in event handlers (e.g., joining rooms)
        socket.data.user = user;
        console.log(` => [MIDDLEWARE: socketAuthMiddleware] Socket connection authenticated for user ${user._id}`);

        next();
    } catch (error) {
        console.error(" => [MIDDLEWARE ERROR: socketAuthMiddleware] Socket Auth Error:", error);
        next(new Error("Unauthorized: Invalid or expired token"));
    }
};