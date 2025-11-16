import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { getCourses, getCourse, getMyCourses } from '../controllers/courseController.js';

const router = express.Router();

router.get('/', optionalAuth, getCourses);
router.get('/my-courses', optionalAuth, getMyCourses);
router.get('/:id', optionalAuth, getCourse);

export default router;