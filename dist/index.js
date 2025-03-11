"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const event_1 = __importDefault(require("./routes/event"));
const eventParticipant_1 = __importDefault(require("./routes/eventParticipant"));
const guru_1 = __importDefault(require("./routes/guru"));
const authController = __importStar(require("./controllers/auth"));
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
const port = process.env.PORT || 3005;
// Initialize Prisma client
exports.prisma = new client_1.PrismaClient();
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api', event_1.default);
app.use('/api/guru', guru_1.default);
// Add a direct login route for backward compatibility
app.post('/api/login', (req, res) => {
    // Forward the request to the auth login route
    authController.login(req, res);
});
// Make sure event participant routes are registered correctly
// Register the routes directly at the root level to handle all variations
app.use(eventParticipant_1.default);
// Also register them explicitly at the /api path to ensure they're accessible
app.use('/api', eventParticipant_1.default);
// Debug route to check if the server is receiving requests
app.get('/api/debug', (req, res) => {
    res.status(200).json({ message: 'Debug endpoint reached' });
});
// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Zuper Node API is running' });
});
// 404 handler
app.use((req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Not Found' });
});
// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Event routes registered at /api/...`);
    console.log(`Event participant routes registered at /api/event-participants and /event-participants`);
    console.log(`Guru routes registered at /api/guru/...`);
});
// Handle Prisma connection on shutdown
process.on('beforeExit', () => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.prisma.$disconnect();
}));
