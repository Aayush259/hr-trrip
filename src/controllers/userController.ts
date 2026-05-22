import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import envConfig from "../config/envConfig.js";

const generateTokens = (userId: string) => {
    console.log(` => [CONTROLLER: generateTokens] Generating tokens for user ${userId}`);
    const accessSecret = envConfig.jwt_access_secret;
    const refreshSecret = envConfig.jwt_refresh_secret;

    const accessToken = jwt.sign({ userId }, accessSecret, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId }, refreshSecret, { expiresIn: "7d" });

    return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<void> => {
    console.log(" => [CONTROLLER: register] Request hit");
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log(" => [CONTROLLER: register] User already exists");
            res.status(400).json({ status: "failure", message: "User already exists" });
            return;
        }

        const user = new User({ name, email, password });
        await user.save();
        console.log(` => [CONTROLLER: register] User ${user._id} saved successfully`);

        const { accessToken, refreshToken } = generateTokens(user._id.toString());

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        console.log(" => [CONTROLLER: register] Request ended successfully");
        res.status(201).json({
            status: "success",
            message: "User registered successfully",
            data: {
                accessToken,
                user: { _id: user._id, name: user.name, email: user.email }
            }
        });
    } catch (error) {
        console.error(" => [CONTROLLER ERROR: register] Internal error:", error);
        res.status(500).json({ status: "failure", message: "Internal server error" });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    console.log(" => [CONTROLLER: login] Request hit");
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            console.log(" => [CONTROLLER: login] Invalid credentials (user not found)");
            res.status(400).json({ status: "failure", message: "Invalid credentials" });
            return;
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log(" => [CONTROLLER: login] Invalid credentials (password mismatch)");
            res.status(400).json({ status: "failure", message: "Invalid credentials" });
            return;
        }

        console.log(` => [CONTROLLER: login] User ${user._id} authenticated successfully`);

        const { accessToken, refreshToken } = generateTokens(user._id.toString());

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        console.log(" => [CONTROLLER: login] Request ended successfully");
        res.status(200).json({
            status: "success",
            message: "Login successful",
            data: {
                accessToken,
                user: { _id: user._id, name: user.name, email: user.email }
            }
        });
    } catch (error) {
        console.error(" => [CONTROLLER ERROR: login] Internal error:", error);
        res.status(500).json({ status: "failure", message: "Internal server error" });
    }
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
    console.log(" => [CONTROLLER: me] Request hit");
    // req.user is populated by the auth middleware
    console.log(` => [CONTROLLER: me] Returning profile for user ${req.user?._id}`);
    res.status(200).json({ status: "success", message: "User profile retrieved", data: { user: req.user } });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    console.log(" => [CONTROLLER: refreshToken] Request hit");
    try {
        const token = req.cookies.refreshToken;

        if (!token) {
            console.log(" => [CONTROLLER: refreshToken] No refresh token provided in cookies");
            res.status(401).json({ status: "failure", message: "Unauthorized: No refresh token provided" });
            return;
        }

        const refreshSecret = process.env.JWT_REFRESH_SECRET || "default_refresh_secret";
        const decoded = jwt.verify(token, refreshSecret) as { userId: string };

        const user = await User.findById(decoded.userId);
        if (!user) {
            console.log(" => [CONTROLLER: refreshToken] Invalid refresh token (user not found)");
            res.status(401).json({ status: "failure", message: "Unauthorized: Invalid refresh token" });
            return;
        }

        console.log(` => [CONTROLLER: refreshToken] Refreshing tokens for user ${user._id}`);
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id.toString());

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        console.log(" => [CONTROLLER: refreshToken] Request ended successfully");
        res.status(200).json({ status: "success", message: "Token refreshed successfully", data: { accessToken } });
    } catch (error) {
        console.error(" => [CONTROLLER ERROR: refreshToken] Token verification error:", error);
        res.status(401).json({ status: "failure", message: "Unauthorized: Invalid or expired refresh token" });
    }
};
