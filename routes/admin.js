import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { getAllUsers, getAllPurchases } from '../controllers/adminController.js';

const router = express.Router();

// Все эти роуты требуют авторизации И прав администратора
router.get('/users', authenticateToken, requireAdmin, getAllUsers);
router.get('/purchases', authenticateToken, requireAdmin, getAllPurchases);

export default router;