import mongoose from 'mongoose';

const discountCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [1, 'Discount value must be at least 1'],
    },
    maxUses: {
      type: Number,
      required: [true, 'Max uses is required'],
      min: [1, 'Max uses must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

const DiscountCode = mongoose.model('DiscountCode', discountCodeSchema);

export default DiscountCode;