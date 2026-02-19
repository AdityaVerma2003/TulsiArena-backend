import { OAuth2Client } from "google-auth-library";
import User from "../Models/User.js"
import jwt from "jsonwebtoken"
import {sendRegistrationEmail} from "../Utils/emailService.js";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
import DiscountCode from "../Models/DiscountCode.js"; // ← add this import

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    console.log("register controller")

    // --- 1. Robust Input Validation ---

    // Simple Email Regex (for basic format check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Simple Mobile Number Regex (e.g., 10 digits, adjust as per country/region)
    const mobileRegex = /^\d{10}$/; 

    // **Name Validation**
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be at least 2 characters long'
      });
    }

    // **Email Validation**
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required'
      });
    }

    // **Mobile Validation**
    if (!mobile || !mobileRegex.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'A valid 10-digit mobile number is required'
      });
    }

    // --- 2. Check for existing users (Data Integrity) ---

    // Check if user already exists with this email
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    console.log("user does not exits")

    // Check if user already exists with this mobile
    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this mobile number'
      });
    }
    console.log("mobile does not exisits")

    
    // Create user
    const user = new User({
      name,
      email,
      mobile,
      password 
    })

    const savedUser = await user.save();
    // Send registration email
    console.log("after saving user" , savedUser)
    // await sendRegistrationEmail(email, name);

    // Generate token (assuming generateToken function is defined elsewhere)
    const token = generateToken(user._id);
    console.log("token generate" , token)

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role // Assuming role exists on the user model
      }
    });
  } catch (error) {
    // This is a catch-all for database errors or other unexpected issues
    return res.status(500).json({ 
      success: false,
      message: 'Registration failed due to a server error',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
        // Simple hardcoded admin credentials (in production, use database)
    if (email === 'admin@tulsiarena.com' && password === 'admin123') {
      // Find or create admin user
      let adminUser = await User.findOne({ email: 'admin@tulsiarena.com' });
      
      if (!adminUser) {
        adminUser = await User.create({
          name: 'Admin',
          email: 'admin@tulsiarena.com',
          mobile: '9999999999',
          password: 'admin123',
          role: 'admin'
        });
      }

      const token = generateToken(adminUser._id);

      return res.status(200).json({
        success: true,
        message: 'Admin login successful',
        token,
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role
        }
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

   
    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};



const logout = async (req, res) => {
  // Since JWT is stateless, logout can be handled on the client side by deleting the token.
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
};

const googleRegister = async (req, res) => {
 try {
    const { token } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists - update googleId if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.profilePicture = picture;
        await user.save();
      }
    } else {
      // Create new user with Google OAuth
      user = await User.create({
        name,
        email,
        googleId,
        profilePicture: picture,
        // No password or mobile needed for Google users
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed',
    });
  }
};


// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
};


const validateDiscountCode = async (req, res) => {
  try {
    const { code, facilityType, timeSlots, additionalPlayers, basePrice } = req.body;
    const userId = req.user._id;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Code is required' });
    }
    if (!facilityType || !timeSlots || !basePrice) {
      return res.status(400).json({ success: false, message: 'Booking details are required to validate a coupon' });
    }

    // ── Calculate orderAmount server-side (same logic as createBooking) ──
    let orderAmount = 0;
    if (facilityType === 'pool') {
      // Pool: price per person
      orderAmount = parseInt(basePrice) * (parseInt(additionalPlayers) || 1);
    } else {
      // Turf / Combo: base price per slot + ₹100 per additional player
      const slotCount = Array.isArray(timeSlots) ? timeSlots.length : 1;
      const additionalPlayersCost = (parseInt(additionalPlayers) || 0) * 100;
      orderAmount = parseInt(basePrice) * slotCount + additionalPlayersCost;
    }

    if (orderAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid booking amount' });
    }

    // ── Fetch and validate the discount code ──
    const discount = await DiscountCode.findOne({ code: code.toUpperCase() });

    if (!discount) {
      return res.status(404).json({ success: false, message: 'Invalid discount code' });
    }
    if (!discount.isActive) {
      return res.status(400).json({ success: false, message: 'This code is currently inactive' });
    }
    if (new Date(discount.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'This discount code has expired' });
    }
    if (discount.usedCount >= discount.maxUses) {
      return res.status(400).json({ success: false, message: 'This code has reached its usage limit' });
    }
    if (discount.usedBy.map(id => id.toString()).includes(userId.toString())) {
      return res.status(400).json({ success: false, message: 'You have already used this discount code' });
    }
    if (discount.minOrderAmount > 0 && orderAmount < discount.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${discount.minOrderAmount} required for this code`
      });
    }

    // ── Calculate discount amount ──
    let discountAmount = 0;
    if (discount.discountType === 'percentage') {
      discountAmount = Math.floor((orderAmount * discount.discountValue) / 100);
    } else {
      // flat — can't discount more than the order itself
      discountAmount = Math.min(discount.discountValue, orderAmount);
    }

    const finalAmount = orderAmount - discountAmount;

    res.status(200).json({
      success: true,
      discountAmount,
      finalAmount,
      orderAmount,        // send back so frontend can display it
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      message: `Code applied! You save ₹${discountAmount}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate discount code',
      error: error.message
    });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// redeemDiscountCode — unchanged, still called after booking is confirmed
// ─────────────────────────────────────────────────────────────────────────────
const redeemDiscountCode = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

    const discount = await DiscountCode.findOne({ code: code.toUpperCase() });

    if (!discount) return res.status(404).json({ success: false, message: 'Discount code not found' });
    if (discount.usedCount >= discount.maxUses) return res.status(400).json({ success: false, message: 'Code usage limit reached' });
    if (discount.usedBy.map(id => id.toString()).includes(userId.toString())) {
      return res.status(400).json({ success: false, message: 'You have already used this code' });
    }

    discount.usedCount += 1;
    discount.usedBy.push(userId);
    await discount.save();

    res.status(200).json({ success: true, message: 'Discount code redeemed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to redeem discount code', error: error.message });
  }
};



export {login , register , getMe , logout , googleRegister , validateDiscountCode , redeemDiscountCode};