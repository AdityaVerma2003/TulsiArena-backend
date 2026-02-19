import Booking from "../Models/Booking.js";
import User from "../Models/User.js";
import DiscountCode from "../Models/DiscountCode.js"; // ← add this import

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private/Admin
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email mobile')
      .sort({ createdAt: -1 });

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

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyBookings = await Booking.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1)
      }
    });

    const revenueData = await Booking.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    const monthlyRevenueData = await Booking.aggregate([
      {
        $match: {
          status: { $ne: 'Cancelled' },
          createdAt: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lt: new Date(currentYear, currentMonth + 1, 1)
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const monthlyRevenue = monthlyRevenueData.length > 0 ? monthlyRevenueData[0].total : 0;

    const facilityStats = await Booking.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: '$facilityName', count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } }
    ]);

    const totalUsers = await User.countDocuments({ role: 'user' });

    res.status(200).json({
      success: true,
      stats: {
        totalBookings,
        monthlyBookings,
        totalRevenue,
        monthlyRevenue,
        totalUsers,
        facilityStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// @desc    Get bookings by facility
// @route   GET /api/admin/bookings/facility/:facilityName
// @access  Private/Admin
const getBookingsByFacility = async (req, res) => {
  try {
    const { facilityName } = req.params;

    const bookings = await Booking.find({ facilityName })
      .populate('user', 'name email mobile')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      facilityName,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facility bookings',
      error: error.message
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/admin/bookings/:id/status
// @access  Private/Admin
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: error.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DISCOUNT CODE CONTROLLERS
// ─────────────────────────────────────────────────────────────

// @desc    Get all discount codes
// @route   GET /api/admin/discount-codes
// @access  Private/Admin
const getAllDiscountCodes = async (req, res) => {
  try {
    const codes = await DiscountCode.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, codes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch discount codes', error: error.message });
  }
};

// @desc    Create a new discount code
// @route   POST /api/admin/discount-codes
// @access  Private/Admin
const createDiscountCode = async (req, res) => {
  try {
    const { code, discountType, discountValue, maxUses, expiresAt, minOrderAmount, description } = req.body;

    if (!code || !discountType || !discountValue || !maxUses || !expiresAt) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }
    if (!['percentage', 'flat'].includes(discountType)) {
      return res.status(400).json({ success: false, message: 'discountType must be percentage or flat' });
    }
    if (discountType === 'percentage' && Number(discountValue) > 100) {
      return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%' });
    }
    if (Number(discountValue) <= 0) {
      return res.status(400).json({ success: false, message: 'Discount value must be greater than 0' });
    }
    if (Number(maxUses) < 1) {
      return res.status(400).json({ success: false, message: 'Max uses must be at least 1' });
    }
    if (new Date(expiresAt) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Expiry date must be in the future' });
    }

    const existing = await DiscountCode.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A discount code with this name already exists' });
    }

    const discount = await DiscountCode.create({
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      maxUses: Number(maxUses),
      expiresAt: new Date(expiresAt),
      minOrderAmount: Number(minOrderAmount) || 0,
      description: description || '',
    });

    res.status(201).json({ success: true, discount });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Discount code already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create discount code', error: error.message });
  }
};

// @desc    Toggle discount code active / inactive
// @route   PATCH /api/admin/discount-codes/:id/toggle
// @access  Private/Admin
const toggleDiscountCode = async (req, res) => {
  try {
    const { isActive } = req.body;

    const code = await DiscountCode.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!code) {
      return res.status(404).json({ success: false, message: 'Discount code not found' });
    }

    res.status(200).json({ success: true, code });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle discount code', error: error.message });
  }
};

// @desc    Delete a discount code
// @route   DELETE /api/admin/discount-codes/:id
// @access  Private/Admin
const deleteDiscountCode = async (req, res) => {
  try {
    const code = await DiscountCode.findByIdAndDelete(req.params.id);

    if (!code) {
      return res.status(404).json({ success: false, message: 'Discount code not found' });
    }

    res.status(200).json({ success: true, message: 'Discount code deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete discount code', error: error.message });
  }
};


export {
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
};