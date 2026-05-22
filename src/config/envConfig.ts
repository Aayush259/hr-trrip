/**
 * @file envConfig.ts
 * @description Centralized configuration management for the platform.
 * 
 * CORE CONCEPT:
 * The "Config" layer serves as the single source of truth for all environment-specific 
 * variables. It handles the extraction and normalization of environment settings 
 * to ensure consistent behavior across 
 * different deployment stages (development, staging, production).
 * 
 * Responsibilities:
 * - Environment Variable Loading: Utilizes dotenv to load local .env files.
 */

import dotenv from "dotenv";

dotenv.config();

const config = {
    port: Number(process.env.PORT) || 3000,
    frontend_url: String(process.env.FRONTEND_URL),

    mongo_user: String(process.env.MONGO_USER),
    mongo_password: String(process.env.MONGO_PASSWORD),
    mongo_uri: String(process.env.MONGO_URI),
    mongo_database: String(process.env.MONGO_DATABASE),

    jwt_access_secret: String(process.env.JWT_SECRET),
    jwt_refresh_secret: String(process.env.JWT_REFRESH_SECRET),
}

export default config;
