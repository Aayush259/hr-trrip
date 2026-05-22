import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { setupSocketHandlers, SocketData } from "./socket/index.js";
import envConfig from "./config/envConfig.js";
import { connectDB } from "./lib/db.js";
import { socketAuthMiddleware } from "./middleware/socketAuthMiddleware.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const server = createServer(app);

// Socket.IO server with CORS
const io = new Server<any, any, any, SocketData>(server, {
    cors: {
        origin: envConfig.frontend_url,
        credentials: true,
    },
});

// CORS for Express
app.use(cors({
    origin: envConfig.frontend_url,
    credentials: true,
}));

app.set("io", io);
app.use(express.json());
app.use(cookieParser());

app.use("/api/users", userRoutes);

io.use(socketAuthMiddleware);
setupSocketHandlers(io);

server.listen(envConfig.port, async () => {
    await connectDB();
    console.log(" > Server running on port", envConfig.port);
});
