import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  listActiveDiscounts,
  applyToDiscount,
  myApplications,
  getProfile,
  updateProfile
} from '../controllers/userController.js';
import { redeemToken } from '../controllers/userController.js';

const router = Router();

router.use(authenticate);

router.get('/discounts', listActiveDiscounts);
router.post('/discounts/:id/apply', applyToDiscount);
router.get('/applications', myApplications);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/tokens/redeem', redeemToken);

export default router;


