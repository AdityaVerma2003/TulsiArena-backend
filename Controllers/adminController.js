

import Booking from "../Models/Booking.js";
import User from "../Models/User.js";

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
    // Total bookings
    const totalBookings = await Booking.countDocuments();

    // Monthly bookings
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyBookings = await Booking.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1)
      }
    });

    // Total revenue
    const revenueData = await Booking.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    // Monthly revenue
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

    // Bookings by facility
    const facilityStats = await Booking.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: '$facilityName', count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } }
    ]);

    // Total users
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
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
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

export { getAllBookings, getDashboardStats, getBookingsByFacility, updateBookingStatus, getAllUsers };