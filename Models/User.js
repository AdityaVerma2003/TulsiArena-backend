import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import validator from "validator"

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  mobile: {
    type: String,
    required: function() {
      // Mobile is only required if user doesn't have googleId
      return !this.googleId;
    },
    validate: {
      validator: function(v) {
        // Only validate if mobile exists
        if (!v) return true;
        return /^[6-9]\d{9}$/.test(v);
      },
      message: 'Please provide a valid 10-digit Indian mobile number'
    }
  },
  password: {
    type: String,
    required: function() {
      // Password is only required if user doesn't have googleId
      return !this.googleId;
    },
    select: false // Don't return password in queries by default
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values but unique non-null values
  },
  profilePicture: {
    type: String, // Store Google profile picture URL
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving (only if password exists)
userSchema.pre('save', async function() {
  // Only hash if password is modified and exists
  if (!this.isModified('password') || !this.password) {
    return;
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    throw new Error('User does not have a password (OAuth user)');
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;