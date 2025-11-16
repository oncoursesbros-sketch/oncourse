import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getLearningProgress } from '../controllers/profileController.js';

const router = express.Router();

router.get('/progress', authenticateToken, getLearningProgress);

export default router;