// bookingRouter.js (Updated)
import express from "express";
import { 
    createBooking , 
    getMyBookings , 
    getBooking , 
    cancelBooking,
    getAllBookingsByDate // 🚀 IMPORT NEW FUNCTION
} from '../Controllers/bookingController.js';
import { protect } from '../Middlewares/authMiddleware.js';  
const bookingRouter = express.Router();

bookingRouter.post('/', protect, createBooking);
bookingRouter.get('/my-bookings', protect, getMyBookings);

// 🚀 NEW ROUTE: To get all bookings for a specific date (e.g., /api/bookings/by-date?date=2025-12-03)
bookingRouter.get('/by-date', protect, getAllBookingsByDate); 

bookingRouter.get('/:id', protect, getBooking);
bookingRouter.put('/:id/cancel', protect, cancelBooking);

export default bookingRouter;