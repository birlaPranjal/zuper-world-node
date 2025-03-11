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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const guruController = __importStar(require("../controllers/guruController"));
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});
// Guru Application Routes
router.post('/applications', auth_1.authenticateToken, upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 }
]), guruController.submitGuruApplication);
router.get('/applications', auth_1.authenticateToken, auth_1.isAdmin, guruController.getAllApplications);
router.get('/applications/:id', auth_1.authenticateToken, guruController.getApplicationById);
router.get('/applications/user/:userId', auth_1.authenticateToken, guruController.getApplicationByUser);
router.get('/applications/user/:userId/check', auth_1.authenticateToken, guruController.checkUserApplication);
router.patch('/applications/:id/status', auth_1.authenticateToken, auth_1.isAdmin, guruController.updateApplicationStatus);
// Success Story Routes
router.post('/success-stories', auth_1.authenticateToken, auth_1.isAdminOrGuru, upload.fields([{ name: 'image', maxCount: 1 }]), guruController.createSuccessStory);
router.get('/success-stories', guruController.getAllSuccessStories);
// User-specific routes must come before the :id route to avoid conflicts
router.get('/success-stories/user/:userId', auth_1.authenticateToken, guruController.getSuccessStoriesByUser);
router.get('/success-stories/user/:userId/stats', auth_1.authenticateToken, guruController.getSuccessStoryStats);
// Individual story routes
router.get('/success-stories/:id', guruController.getSuccessStoryById);
router.put('/success-stories/:id', auth_1.authenticateToken, auth_1.isAdminOrGuru, upload.fields([{ name: 'image', maxCount: 1 }]), guruController.updateSuccessStory);
router.patch('/success-stories/:id/publish', auth_1.authenticateToken, auth_1.isAdmin, guruController.updateSuccessStoryStatus);
exports.default = router;
