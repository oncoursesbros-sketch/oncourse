import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  getCart, 
  addToCart, 
  removeFromCart, 
  clearCart 
} from '../controllers/cartController.js';

const router = express.Router();

router.get('/', authenticateToken, getCart);
router.post('/add/:id', authenticateToken, addToCart);
router.delete('/remove/:id', authenticateToken, removeFromCart);
router.delete('/clear', authenticateToken, clearCart);

export default router;