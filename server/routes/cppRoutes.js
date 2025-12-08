import express from 'express';
import * as cppController from '../controllers/cppController.js';

const router = express.Router();

// GET /api/cpp/status - Get C++ modules status
router.get('/status', cppController.getCppStatus);

export default router;