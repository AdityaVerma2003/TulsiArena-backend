import express from 'express';
import {
  createOrder,
  verifyPaymentAndBook,
  cancelBooking,
  getBooking,
  getMyBookings,
  getAllBookingsByDate,
} from '../Controllers/bookingController.js';
import { protect } from '../Middlewares/authMiddleware.js';

const bookingRouter = express.Router();

bookingRouter.use(protect);

// ── Razorpay payment flow (replaces old POST /) ────────────────────────────
bookingRouter.post('/create-order', createOrder);         // Step 1: get Razorpay orderId
bookingRouter.post('/verify-payment', verifyPaymentAndBook); // Step 2: verify & create booking

// ── Existing routes ────────────────────────────────────────────────────────
bookingRouter.get('/my-bookings', getMyBookings);
bookingRouter.get('/by-date', getAllBookingsByDate);
bookingRouter.get('/:id', getBooking);
bookingRouter.put('/:id/cancel', cancelBooking);

export default bookingRouter;