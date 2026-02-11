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
    enum: ['Turf', 'Turf + Swimming Pool', 'Swimming Pool']
  },
  facilityType: {
    type: String,
    enum: ['turf', 'combo', 'pool'],
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  timeSlots: {
    type: [String],
    required: [true, 'Time slots are required']
  },
  additionalPlayers: {
    type: Number,
    default: 0,
    min: [0, 'Additional players cannot be negative'],
    max: [25, 'Maximum 25 persons allowed'], // 🚀 UPDATED: Max 25 for pool
    validate: {
      validator: function(value) {
        // For pool bookings, at least 1 person is required
        if (this.facilityType === 'pool') {
          return value >= 1 && value <= 25;
        }
        // For turf and combo, max 4 additional players
        return value >= 0 && value <= 4;
      },
      message: props => {
        if (props.instance.facilityType === 'pool') {
          return 'Pool bookings require 1-25 persons';
        }
        return 'Additional players must be between 0-4 for turf/combo bookings';
      }
    }
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
bookingSchema.index({ facilityName: 1, date: 1 });
// 🚀 NEW: Index for pool capacity queries
bookingSchema.index({ facilityType: 1, date: 1, timeSlots: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;