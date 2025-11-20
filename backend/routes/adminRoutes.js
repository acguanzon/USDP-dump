import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  createDiscount,
  listDiscounts,
  updateDiscount,
  deleteDiscount
} from '../controllers/adminController.js';
import { generateTokensForDiscount, listTokensForDiscount } from '../controllers/adminController.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/discounts', listDiscounts);
router.post('/discounts', createDiscount);
router.put('/discounts/:id', updateDiscount);
router.delete('/discounts/:id', deleteDiscount);

// Tokens for a discount
router.post('/discounts/:id/tokens', generateTokensForDiscount);
router.get('/discounts/:id/tokens', listTokensForDiscount);

export default router;


