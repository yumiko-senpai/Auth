import Student from "../models/student.js";
import TempUser from "../models/tempUser.js";
import transporter from "../utils/sendEmails.js"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
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
      subject: "Verify your email",
      text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  const { name, email, password, otp } = req.body;

  try {
    
  if (!name || !email || !password || !otp) {
    return res.status(400).json({ message: "Name, email, password, and OTP are required" });
  }
    const tempUser = await TempUser.findOne({ email });
    if (!tempUser) return res.status(400).json({ message: "No student with that email" });
    if (!tempUser.otp || tempUser.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired or not found" });
    if (tempUser.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await Student.create({ name, email, password: hashedPassword });

    await TempUser.deleteOne({ email });

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
     if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
    const existingStudent = await Student.findOne({ email });
    if (!existingStudent) 
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, existingStudent.password);
    if (!isMatch) 
      return res.status(400).json({ message: "Invalid email or password" });

    const accessToken = jwt.sign(
      { id: existingStudent._id },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );
    res.status(200).json({ accessToken, message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
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
      subject: "Your new verification OTP",
      text: otp,
    });

    res.status(200).json({ message: "New OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendPasswordResetOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(400).json({ message: "No student with that email is registered" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; 

    student.resetOTP = otp;
    student.resetOTPExpiry = expiresAt;
    student.resetSessionToken = undefined; 
    await student.save();

    await transporter.sendMail({
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. It expires in 5 minutes.`,
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyResetOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) return res.status(400).json({ message: "No student with that email" });

    if (!student.resetOTP || student.resetOTPExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (student.resetOTP !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const resetSessionToken = jwt.sign(
      { id: student._id },
      process.env.JWT_SECRET,
      { expiresIn: "10m" } 
    );

    student.resetSessionToken = resetSessionToken;
    await student.save();

    res.status(200).json({ message: "OTP verified", resetSessionToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setNewPassword = async (req, res) => {
  const { resetSessionToken, newPassword } = req.body;

  try {
    if (!resetSessionToken) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    const decoded = jwt.verify(resetSessionToken, process.env.JWT_SECRET);
    const student = await Student.findOne({ _id: decoded.id, resetSessionToken });
    if (!student) {
      return res.status(400).json({ message: "Invalid or expired reset session" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;

    student.resetOTP = undefined;
    student.resetOTPExpiry = undefined;
    student.resetSessionToken = undefined;

    await student.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

