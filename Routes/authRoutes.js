import express from 'express';
import {register , login ,  getMe , logout , googleRegister} from '../Controllers/authControllers.js';
import { protect } from '../Middlewares/authMiddleware.js';
const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/google-register', googleRegister)
authRouter.post('/login', login);
authRouter.post('/logout', protect, logout);
authRouter.get('/me', protect, getMe);

export default authRouter;