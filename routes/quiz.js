import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getQuiz, submitQuiz } from '../controllers/quizController.js';

const router = express.Router();

router.get('/:lessonId', authenticateToken, getQuiz);
router.post('/:lessonId/submit', authenticateToken, submitQuiz);

export default router;