import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { getProfile, updateProfile, uploadAvatar } from '../controllers/userController.js';

const router = express.Router();

router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), uploadAvatar);

export default router;