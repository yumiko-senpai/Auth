import mongoose from "mongoose";

const AgencySchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true
    },
    servicesOffered: {
      type: [String],
      default: []
    },
    address: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    process: {
      type: [String],
      default: []
    },
    contactInfo: {
      email: {
        type: String,
        trim: true

      },
      phone: {
        type: String,
        trim: true
      }
    },
    partnerUniversities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "University"
      }
    ],
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

AgencySchema.index({ email: 1 }); 
export default mongoose.model("Agency", AgencySchema);
