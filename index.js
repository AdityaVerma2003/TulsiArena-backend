import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './Routes/authRoutes.js';
import bookingRouter from './Routes/bookingRoutes.js';
import adminRouter from './Routes/adminRoutes.js';
import connectDB from './connectDB.js';
import helmet from 'helmet';


// Load environment variables
dotenv.config();



const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

// Routes
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/admin', adminRouter);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tulsi Arena API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
  next();
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
