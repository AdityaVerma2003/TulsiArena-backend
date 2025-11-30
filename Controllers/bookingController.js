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

    // --- Slot Conflict Check ---
    
    // Find any existing bookings (that are not cancelled) on the same facility and date
    const existingBookings = await Booking.find({
      facilityName,
      date: new Date(date),
      status: { $nin: ['Cancelled'] }
    }).select('timeSlots');

    // Extract all previously booked slots for this facility/date
    const bookedSlots = existingBookings.flatMap(booking => booking.timeSlots);
    
    // Check for overlap between requested slots and already booked slots
    const conflictSlots = timeSlots.filter(slot => bookedSlots.includes(slot));

    if (conflictSlots.length > 0) {
      return res.status(400).json({
        success: false,
        message: `The following time slot(s) are already booked: ${conflictSlots.join(', ')}`,
      });
    }

    // --- Price Calculation ---
    
    // Assuming basePrice provided in req.body is the cost PER SLOT
    const totalBasePrice = parseInt(basePrice) * timeSlots.length;
    
    // Additional player cost is still per booking, not per slot
    // Assuming additionalPlayers cost is 100 per player per booking (not per slot)
    const additionalPlayersCost = (additionalPlayers || 0) * 100; 
    
    const totalPrice = totalBasePrice + additionalPlayersCost;

    // Create booking
    const booking = await Booking.create({
      user: req.user.id,
      facilityName,
      facilityType: facilityType || 'turf',
      date: new Date(date),
      timeSlots, // Use the array
      additionalPlayers: additionalPlayers || 0,
      basePrice: totalBasePrice, // Store the calculated total base price
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
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
};

// ... (get and cancel functions remain mostly the same, as they don't modify structure)

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

export {cancelBooking , createBooking , getBooking , getMyBookings}