import express from "express";
import {
  sendOTP,
  verifyOTP,
  resendOTP,
  login,
  sendPasswordResetOTP,
  verifyResetOTP,
  setNewPassword,
  getAgencyById
} from "../controller/agencyController.js";

import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Registration
router.post("/auth/send-otp", sendOTP);
router.post("/auth/verify-otp", verifyOTP);
router.post("/auth/resend-otp", resendOTP);

// Login
router.post("/auth/login", login);

// Protected test route (example)
router.get("/home", verifyToken, (req, res) => {
  res.status(200).json({ message: "Welcome to the home page" });
});

// Password reset
router.post("/auth/password-reset/send-otp", sendPasswordResetOTP);
router.post("/auth/password-reset/verify-otp", verifyResetOTP);
router.patch("/auth/password-reset", setNewPassword);

router.get("/:id", getAgencyById)

export default router;
