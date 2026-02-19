import mongoose from "mongoose";

const bookingDraftSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    facilityName: String,
    facilityType: String,
    date: Date,
    timeSlots: [String],
    additionalPlayers: Number,
    basePrice: Number,
    additionalPlayersCost: Number,
    discountCode: String,
    discountAmount: Number,
    totalPrice: Number,
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Expired"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("BookingDraft", bookingDraftSchema);