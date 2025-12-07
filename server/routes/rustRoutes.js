import express from 'express';
import { getRustStatus } from '../controllers/rustController.js';

const router = express.Router();

// GET /api/rust/status - Get Rust modules status
router.get('/status', getRustStatus);

export default router;