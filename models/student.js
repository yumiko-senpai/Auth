import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { 
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency"
    },
    resetOTP: {
      type: String
    },
    resetOTPExpiry: {
      type: Date
    },
    resetSessionToken: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

StudentSchema.index({ email: 1 });

const Student = mongoose.model("Student", StudentSchema);
export default Student;
