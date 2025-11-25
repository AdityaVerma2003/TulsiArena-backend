import express from "express";
import { createBooking , getMyBookings , getBooking , cancelBooking } from '../Controllers/bookingController.js';
import { protect } from '../Middlewares/authMiddleware.js';  
const bookingRouter = express.Router();

bookingRouter.post('/', protect, createBooking);
bookingRouter.get('/my-bookings', protect, getMyBookings);
bookingRouter.get('/:id', protect, getBooking);
bookingRouter.put('/:id/cancel', protect, cancelBooking);

export default bookingRouter;