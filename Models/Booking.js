import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  facilityName: {
    type: String,
    required: [true, 'Facility name is required'],
    enum: ['Turf', 'Turf + Swimming Pool']
  },
  facilityType: {
    type: String,
    enum: ['turf', 'combo'],
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  timeSlot: {
    type: String,
    required: [true, 'Time slot is required']
  },
  additionalPlayers: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  },
  basePrice: {
    type: Number,
    required: true
  },
  additionalPlayersCost: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
    default: 'Confirmed'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

// Index for faster queries
bookingSchema.index({ user: 1, date: 1 });
bookingSchema.index({ facilityName: 1, date: 1, timeSlot: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;