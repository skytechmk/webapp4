import express from 'express';
import { getGpuStatus } from '../controllers/gpuController.js';

const router = express.Router();

// GET /api/gpu/status - Get GPU service status
router.get('/status', getGpuStatus);

export default router;