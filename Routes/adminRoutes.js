
import express from 'express';

import {getAllBookings, getDashboardStats, getBookingsByFacility, updateBookingStatus, getAllUsers} from '../Controllers/adminController.js';

import { protect, adminOnly } from '../Middlewares/authMiddleware.js';

const adminRouter = express.Router();

// All admin routes require authentication and admin role
adminRouter.use(protect);
adminRouter.use(adminOnly);
adminRouter.get('/bookings', getAllBookings);
adminRouter.get('/stats', getDashboardStats);
adminRouter.get('/bookings/facility/:facilityName', getBookingsByFacility);
adminRouter.put('/bookings/:id/status', updateBookingStatus);
adminRouter.get('/users', getAllUsers);

export default adminRouter;