import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User.js";

// Extend Express Request interface to include user
export interface AuthRequest extends Request {
    user?: IUser;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    console.log(` => [MIDDLEWARE: authMiddleware] Intercepting request to ${req.originalUrl}`);
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log(" => [MIDDLEWARE: authMiddleware] No token provided");
            res.status(401).json({ status: "failure", message: "Unauthorized: No token provided" });
            return;
        }

        const token = authHeader.split(" ")[1];
        
        const secret = process.env.JWT_SECRET || "default_secret";
        const decoded = jwt.verify(token, secret) as { userId: string };

        const user = await User.findById(decoded.userId).select("-password");
        
        if (!user) {
            console.log(" => [MIDDLEWARE: authMiddleware] User not found for token");
            res.status(401).json({ status: "failure", message: "Unauthorized: User not found" });
            return;
        }

        req.user = user;
        console.log(` => [MIDDLEWARE: authMiddleware] User ${user._id} authenticated successfully`);
        next();
    } catch (error) {
        console.error(" => [MIDDLEWARE ERROR: authMiddleware] Token validation error:", error);
        res.status(401).json({ status: "failure", message: "Unauthorized: Invalid or expired token" });
    }
};
