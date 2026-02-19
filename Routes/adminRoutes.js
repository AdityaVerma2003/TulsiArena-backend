import express from 'express';
import {
  getAllBookings,
  getDashboardStats,
  getBookingsByFacility,
  updateBookingStatus,
  getAllUsers,
  // Discount codes
  getAllDiscountCodes,
  createDiscountCode,
  toggleDiscountCode,
  deleteDiscountCode,
} from '../Controllers/adminController.js';
import { protect, adminOnly } from '../Middlewares/authMiddleware.js';

const adminRouter = express.Router();

// All admin routes require authentication and admin role
adminRouter.use(protect);
adminRouter.use(adminOnly);

// ── Existing routes ────────────────────────────────────────
adminRouter.get('/bookings', getAllBookings);
adminRouter.get('/stats', getDashboardStats);
adminRouter.get('/bookings/facility/:facilityName', getBookingsByFacility);
adminRouter.put('/bookings/:id/status', updateBookingStatus);
adminRouter.get('/users', getAllUsers);

// ── Discount code routes (admin CRUD) ─────────────────────
adminRouter.get('/discount-codes', getAllDiscountCodes);
adminRouter.post('/discount-codes', createDiscountCode);
adminRouter.patch('/discount-codes/:id/toggle', toggleDiscountCode);
adminRouter.delete('/discount-codes/:id', deleteDiscountCode);


export default adminRouter;