import express from 'express';
import {register , login ,  getMe , logout , googleRegister , validateDiscountCode , redeemDiscountCode} from '../Controllers/authControllers.js';
import { protect } from '../Middlewares/authMiddleware.js';
const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/google-register', googleRegister)
authRouter.post('/login', login);
authRouter.post('/logout', protect, logout);
authRouter.get('/me', protect, getMe);
authRouter.post('/discount-codes/validate', protect ,  validateDiscountCode);
authRouter.post('/discount-codes/redeem', protect ,  redeemDiscountCode);

export default authRouter;