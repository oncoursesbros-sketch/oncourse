import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  createPayment, 
  getPaymentHistory 
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/pay', authenticateToken, createPayment);
router.get('/history', authenticateToken, getPaymentHistory);

export default router;