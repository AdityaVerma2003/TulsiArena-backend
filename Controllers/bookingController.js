import Booking from "../Models/Booking.js";
import BookingDraft from "../Models/BookingDraft.js";
import DiscountCode from "../Models/DiscountCode.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

console.log("Loaded bookingController.js");
console.log("Razorpay keys:", {
  keyId: process.env.RAZORPAY_KEY_ID ? "✅" : "❌",
  keySecret: process.env.RAZORPAY_KEY_SECRET ? "✅" : "❌",
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ───────────────────────── PRICE CALCULATOR ───────────────────────── */

const calculateBookingPrice = (facilityType, timeSlots, additionalPlayers, basePrice) => {
  const parsedBase = parseInt(basePrice);
  const parsedPlayers = parseInt(additionalPlayers) || 0;

  if (isNaN(parsedBase)) {
    throw new Error("Invalid basePrice");
  }

  let totalBasePrice = 0;
  let additionalPlayersCost = 0;

  if (facilityType === "pool") {
    totalBasePrice = parsedBase * parsedPlayers;
  } else {
    totalBasePrice = parsedBase * timeSlots.length;
    additionalPlayersCost = parsedPlayers * 100;
  }

  return {
    totalBasePrice,
    additionalPlayersCost,
    priceBeforeDiscount: totalBasePrice + additionalPlayersCost,
  };
};

/* ───────────────────────── DISCOUNT VALIDATION ───────────────────────── */

const evaluateDiscount = async (discountCode, priceBeforeDiscount, userId) => {
  if (!discountCode) return { appliedDiscountCode: null, discountAmount: 0 };

  const discount = await DiscountCode.findOne({
    code: discountCode.toUpperCase(),
  });

  if (!discount) {
    console.log("Discount not found");
    return { appliedDiscountCode: null, discountAmount: 0 };
  }

  const isValid =
    discount.isActive &&
    new Date(discount.expiresAt) > new Date() &&
    discount.usedCount < discount.maxUses &&
    !discount.usedBy.map((id) => id.toString()).includes(userId.toString()) &&
    priceBeforeDiscount >= (discount.minOrderAmount || 0);

  if (!isValid) {
    console.log("Discount invalid conditions failed");
    return { appliedDiscountCode: null, discountAmount: 0 };
  }

  let discountAmount = 0;

  if (discount.discountType === "percentage") {
    discountAmount = Math.floor(
      (priceBeforeDiscount * discount.discountValue) / 100
    );
  } else {
    discountAmount = Math.min(discount.discountValue, priceBeforeDiscount);
  }

  return {
    appliedDiscountCode: discount.code,
    discountAmount,
    discountDoc: discount,
  };
};

/* ───────────────────────── CREATE ORDER ───────────────────────── */

const createOrder = async (req, res) => {
  try {
    console.log("Incoming createOrder body:", req.body);

    const {
      facilityName,
      facilityType,
      date,
      timeSlots,
      additionalPlayers,
      basePrice,
      discountCode,
    } = req.body;

    if (!facilityName || !date || !timeSlots?.length || !basePrice) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const { totalBasePrice, additionalPlayersCost, priceBeforeDiscount } =
      calculateBookingPrice(
        facilityType,
        timeSlots,
        additionalPlayers,
        basePrice
      );

    console.log("Price Before Discount:", priceBeforeDiscount);

    const { appliedDiscountCode, discountAmount } =
      await evaluateDiscount(
        discountCode,
        priceBeforeDiscount,
        req.user._id
      );

    const totalPrice = priceBeforeDiscount - discountAmount;

    console.log("Final totalPrice:", totalPrice);

    if (isNaN(totalPrice) || totalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payable amount",
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: totalPrice * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    console.log("Razorpay Order Created:", razorpayOrder.id);

    /* 🔐 CREATE BOOKING DRAFT */
    await BookingDraft.create({
      user: req.user._id,
      facilityName,
      facilityType,
      date: new Date(date),
      timeSlots,
      additionalPlayers,
      basePrice: totalBasePrice,
      additionalPlayersCost,
      discountCode: appliedDiscountCode,
      discountAmount,
      totalPrice,
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(200).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: totalPrice * 100,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });

  } catch (error) {
    console.error(
      "Create order error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: error.message,
    });
  }
};

/* ───────────────────────── VERIFY PAYMENT ───────────────────────── */

const verifyPaymentAndBook = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment fields" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.log("Signature mismatch");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    /* 🔐 FETCH BOOKING DRAFT */
    const draft = await BookingDraft.findOne({
      razorpayOrderId: razorpay_order_id,
      status: "Pending",
    });

    if (!draft) {
      return res.status(400).json({
        success: false,
        message: "Booking draft not found or already processed",
      });
    }

    /* Mark draft completed */
    draft.status = "Completed";
    await draft.save();

    const booking = await Booking.create({
      user: draft.user,
      facilityName: draft.facilityName,
      facilityType: draft.facilityType,
      date: draft.date,
      timeSlots: draft.timeSlots,
      additionalPlayers: draft.additionalPlayers,
      basePrice: draft.basePrice,
      additionalPlayersCost: draft.additionalPlayersCost,
      discountCode: draft.discountCode,
      discountAmount: draft.discountAmount,
      totalPrice: draft.totalPrice,
      status: "Confirmed",
      paymentStatus: "Paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    console.log("Booking Confirmed:", booking._id);

    res.status(201).json({
      success: true,
      message: "Payment verified and booking confirmed!",
      booking,
    });

  } catch (error) {
    console.error("Verification error:", error.message);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    console.log("Fetching bookings for user:", req.user._id);

    const bookings = await Booking.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("getMyBookings error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};


const getBooking = async (req, res) => {
  try {
    console.log("Fetching booking:", req.params.id);

    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email mobile");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("getBooking error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking",
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    console.log("Cancel request for booking:", req.params.id);

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Only owner or admin can cancel
    if (
      booking.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking already cancelled",
      });
    }

    // Optional: prevent cancelling past bookings
    if (new Date(booking.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel past booking",
      });
    }

    booking.status = "Cancelled";
    await booking.save();

    console.log("Booking cancelled:", booking._id);

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    console.error("cancelBooking error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
};

const getAllBookingsByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date parameter is required",
      });
    }

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["Cancelled"] },
    }).select("timeSlots facilityType additionalPlayers");

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("getAllBookingsByDate error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};
export {
  createOrder,
  verifyPaymentAndBook,
  cancelBooking,
  getBooking,
  getMyBookings,
  getAllBookingsByDate,
};