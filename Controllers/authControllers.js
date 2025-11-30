import User from "../Models/User.js"
import jwt from "jsonwebtoken"
import {sendRegistrationEmail} from "../Utils/emailService.js";

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

    // **Password Validation**
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
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

    // Check if user already exists with this mobile
    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this mobile number'
      });
    }

    
    // Create user
    const user = new User({
      name,
      email,
      mobile,
      password 
    })

    await user.save();
    // Send registration email
    await sendRegistrationEmail(email, name);

    // Generate token (assuming generateToken function is defined elsewhere)
    const token = generateToken(user._id);

    res.status(201).json({
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
    res.status(500).json({ // Changed to 500 for server errors
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

export {login , register , getMe , logout};