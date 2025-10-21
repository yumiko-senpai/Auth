import Agency from "../models/agency.js";
import TempUser from "../models/tempUser.js";
import transporter from "../utils/sendEmails.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const existingAgency = await Agency.findOne({ email });
    if (existingAgency) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await TempUser.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    await transporter.sendMail({
      to: email,
      subject: "Verify your email (Agency Registration)",
      text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  const { organizationName, email, password, otp } = req.body;

  try {
    const tempUser = await TempUser.findOne({ email });
    if (!tempUser) return res.status(400).json({ message: "No temp user found for this email" });
    if (!tempUser.otp || tempUser.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired or not found" });
    if (tempUser.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await Agency.create({
      organizationName,
      email,
      password: hashedPassword,
    });

    await TempUser.deleteOne({ email });

    res.status(201).json({ message: "Agency registered successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const agency = await Agency.findOne({ email });
    if (!agency) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, agency.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const accessToken = jwt.sign(
      { id: agency._id },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        maxAge: 10 * 60 * 1000
      })
      .status(200)
      .json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const existingAgency = await Agency.findOne({ email });
    if (existingAgency) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const tempUser = await TempUser.findOne({ email });

    if (tempUser) {
      const timeSinceLast = Date.now() - tempUser.updatedAt.getTime();
      if (timeSinceLast < 60 * 1000) {
        const secondsLeft = Math.ceil((60 * 1000 - timeSinceLast) / 1000);
        return res.status(429).json({
          message: `Please wait ${secondsLeft}s before requesting a new OTP.`,
        });
      }
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await TempUser.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    await transporter.sendMail({
      to: email,
      subject: "New Verification OTP (Agency)",
      text: `Your new OTP is: ${otp}. It expires in 5 minutes.`,
    });

    res.status(200).json({ message: "New OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendPasswordResetOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const agency = await Agency.findOne({ email });
    if (!agency) {
      return res.status(400).json({ message: "No agency with that email is registered" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    agency.resetOTP = otp;
    agency.resetOTPExpiry = expiresAt;
    agency.resetSessionToken = undefined;
    await agency.save();

    await transporter.sendMail({
      to: email,
      subject: "Password Reset OTP (Agency)",
      text: `Your OTP for password reset is: ${otp}. It expires in 5 minutes.`,
    });

    res.status(200).json({ message: "Password reset OTP sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyResetOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const agency = await Agency.findOne({ email });
    if (!agency) return res.status(400).json({ message: "No agency with that email" });

    if (!agency.resetOTP || agency.resetOTPExpiry < new Date())
      return res.status(400).json({ message: "OTP expired or not found" });

    if (agency.resetOTP !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    const resetSessionToken = jwt.sign(
      { id: agency._id, },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    agency.resetSessionToken = resetSessionToken;
    await agency.save();

    res.cookie("resetSessionToken", resetSessionToken, {
        httpOnly: false,
        sameSite: "lax",
        maxAge: 10 * 60 * 1000
      })
      .status(200)
      .json({ message: "OTP verified" });
      
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setNewPassword = async (req, res) => {
  const resetSessionToken = req.cookies.resetSessionToken;
  const { newPassword } = req.body;

  try {
    if (!resetSessionToken)
      return res.status(400).json({ message: "Reset token is required" });

    const decoded = jwt.verify(resetSessionToken, process.env.JWT_SECRET);
    const agency = await Agency.findOne({ _id: decoded.id, resetSessionToken });
    if (!agency)
      return res.status(400).json({ message: "Invalid or expired reset session" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    agency.password = hashedPassword;

    agency.resetOTP = undefined;
    agency.resetOTPExpiry = undefined;
    agency.resetSessionToken = undefined;

    await agency.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
