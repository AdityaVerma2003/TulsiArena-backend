import Booking from "../Models/Booking.js";

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
  try {
    const { facilityName, facilityType, date, timeSlots, additionalPlayers, basePrice } = req.body;

    // Validate input
    if (!facilityName || !date || !timeSlots || timeSlots.length === 0 || !basePrice) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields, including at least one time slot.'
      });
    }

    // 🚀 POOL-SPECIFIC VALIDATIONS
    const MAX_POOL_CAPACITY = 25;
    
    if (facilityType === 'pool') {
      // Validate person count for pool bookings
      if (!additionalPlayers || additionalPlayers < 1) {
        return res.status(400).json({
          success: false,
          message: 'Pool bookings require at least 1 person.'
        });
      }

      if (additionalPlayers > MAX_POOL_CAPACITY) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_POOL_CAPACITY} persons allowed per pool booking.`
        });
      }

      // Check if booking time is before 9 PM for today's bookings
      const bookingDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      bookingDate.setHours(0, 0, 0, 0);

      const isToday = bookingDate.getTime() === today.getTime();
      
      if (isToday) {
        const currentHour = new Date().getHours();
        if (currentHour >= 21) { // 9 PM or later
          return res.status(400).json({
            success: false,
            message: 'Pool bookings are closed after 9:00 PM. Please try again tomorrow.'
          });
        }
      }

      // 🚀 Check pool capacity for each slot
      for (const slot of timeSlots) {
        // Find all existing pool bookings for this slot on this date (excluding cancelled)
        const existingPoolBookings = await Booking.find({
          facilityType: 'pool',
          date: new Date(date),
          timeSlots: slot,
          status: { $nin: ['Cancelled'] }
        }).select('additionalPlayers');

        // Calculate total persons already booked for this slot
        const totalBookedPersons = existingPoolBookings.reduce(
          (sum, booking) => sum + (booking.additionalPlayers || 0),
          0
        );

        const availableCapacity = MAX_POOL_CAPACITY - totalBookedPersons;

        // Check if there's enough capacity for this booking
        if (additionalPlayers > availableCapacity) {
          return res.status(400).json({
            success: false,
            message: `Only ${availableCapacity} spot(s) available for slot: ${slot}. You requested ${additionalPlayers} persons.`
          });
        }
      }
    }

    // --- Slot Conflict Check for NON-POOL facilities (Turf and Combo) ---
    if (facilityType !== 'pool') {
      const existingBookings = await Booking.find({
        facilityName,
        date: new Date(date),
        status: { $nin: ['Cancelled'] }
      }).select('timeSlots');

      const bookedSlots = existingBookings.flatMap(booking => booking.timeSlots);
      const conflictSlots = timeSlots.filter(slot => bookedSlots.includes(slot));

      if (conflictSlots.length > 0) {
        return res.status(400).json({
          success: false,
          message: `The following time slot(s) are already booked: ${conflictSlots.join(', ')}`,
        });
      }
    }

    // --- Price Calculation ---
    let totalPrice;
    let totalBasePrice;
    let additionalPlayersCost = 0;

    if (facilityType === 'pool') {
      // For pool: price is per person
      totalPrice = parseInt(basePrice) * (additionalPlayers || 1);
      totalBasePrice = totalPrice;
      additionalPlayersCost = 0; // Not applicable for pool
    } else {
      // For turf and combo: base price per slot + additional player cost
      totalBasePrice = parseInt(basePrice) * timeSlots.length;
      additionalPlayersCost = (additionalPlayers || 0) * 100;
      totalPrice = totalBasePrice + additionalPlayersCost;
    }

    console.log("booking request received with data:", {
      facilityName,
      facilityType,
      date,
      timeSlots,
      additionalPlayers,
      basePrice,
      totalBasePrice,
      additionalPlayersCost,
      totalPrice
    });

    // Create booking
    const booking = await Booking.create({
      user: req.user.id,
      facilityName,
      facilityType: facilityType || 'turf',
      date: new Date(date),
      timeSlots,
      additionalPlayers: additionalPlayers || 0,
      basePrice: totalBasePrice,
      additionalPlayersCost,
      totalPrice,
      status: 'Confirmed',
      paymentStatus: 'Pending'
    });

    res.status(201).json({
      success: true,
      message: `Booking for ${timeSlots.length} slot(s) created successfully`,
      booking
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
};

// @desc    Get all user bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('user', 'name email mobile');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking or is admin
    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    if (booking.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    booking.status = 'Cancelled';
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

// 🚀 UPDATED: Get all bookings by date with pool capacity info
// @desc    Get all bookings for a specific date
// @route   GET /api/bookings/by-date?date=YYYY-MM-DD
// @access  Private
const getAllBookingsByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date parameter is required.' 
      });
    }

    // Convert date string to Date objects for querying
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0); 
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 🚀 Fetch all bookings (including pool bookings with person counts)
    const bookings = await Booking.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['Cancelled'] },
      facilityType: { $in: ['turf', 'combo', 'pool'] }
    }).select('timeSlots facilityType additionalPlayers'); // 🚀 Added additionalPlayers

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error("Get bookings by date error:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings by date',
      error: error.message
    });
  }
};

export { 
  cancelBooking, 
  createBooking, 
  getBooking, 
  getMyBookings, 
  getAllBookingsByDate 
};