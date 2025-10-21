import mongoose from "mongoose";

const tempUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

tempUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TempUser = mongoose.model("TempUser", tempUserSchema);
export default TempUser;
