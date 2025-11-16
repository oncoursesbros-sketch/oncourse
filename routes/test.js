import express from 'express';
import { 
  testEmail, 
  testDatabase, 
  createTestData 
} from '../controllers/testController.js';

const router = express.Router();

router.post('/test-email', testEmail);
router.get('/test-database', testDatabase);
router.post('/create-test-data', createTestData);

export default router;