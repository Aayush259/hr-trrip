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
}

export default config;
