const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { registerSchema, loginSchema } = require("../utils/validation");
const { sendEmail } = require("../utils/sendEmail");
const { formatZodErrors } = require("../utils/zodHelpers");

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: formatZodErrors(validationResult.error),
      });
    }

    const { email, password } = validationResult.data;
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    const user = await User.create({
      email,
      password: hashedPassword,
      role: "USER",
      isVerified: false,
      emailOtp: hashedOtp,
      emailOtpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Send OTP email
    await sendEmail({
      to: email,
      subject: "Verify Your HoopScoop Account",
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP is:</p> 
        <h1>${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      `,
    });

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    if (user.otpLockUntil && user.otpLockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.otpLockUntil - Date.now()) / 60000);
      return res.status(429).json({
        message: `Too many failed attempts. Please try again in ${minutesLeft} minutes.`,
      });
    }

    if (!user.emailOtpExpires || user.emailOtpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedOtp !== user.emailOtp) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;

      if (user.otpAttempts >= 5) {
        user.otpLockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes lock
        await user.save();
        return res.status(429).json({
          message:
            "Too many failed attempts. Your account is locked for 30 minutes.",
        });
      }

      await user.save();

      const remainingAttempts = 5 - user.otpAttempts;
      return res.status(400).json({
        message: `Invalid OTP. You have ${remainingAttempts} attempt(s) remaining.`,
      });
    }

    user.isVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    user.otpAttempts = 0;
    user.otpLockUntil = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }, // matches frontend cookie maxAge
    );

    await sendEmail({
      to: user.email,
      subject: "🏀 Welcome to HoopScoop!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0b;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #1a1a1d 0%, #0f0f10 100%); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
                            <!-- Header with Gradient -->
                            <tr>
                                <td style="padding: 0;">
                                    <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                                        <h1 style="margin: 0; font-size: 36px; font-weight: 800; color: #ffffff; letter-spacing: -1px;">
                                            HOOP<span style="background: linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">SCOOP</span>
                                        </h1>
                                        <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 600; letter-spacing: 2px;">YOUR BASKETBALL BLOG</p>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Main Content -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="margin: 0 0 20px; font-size: 28px; font-weight: 700; color: #ffffff;">
                                        Welcome to the Court! 🏀
                                        Your Email is Verified! 🎉
                                    </h2>
                                    
                                    <p style="margin: 0 0 16px; color: #d1d5db; font-size: 16px; line-height: 1.6;">
                                        Hi there,
                                    </p>
                                    
                                    <p style="margin: 0 0 16px; color: #d1d5db; font-size: 16px; line-height: 1.6;">
                                        Thank you for joining <strong style="color: #f97316;">HoopScoop</strong>, your ultimate destination for basketball content! We're thrilled to have you on our team.
                                    </p>
                                    
                                    <div style="background: rgba(249, 115, 22, 0.1); border-left: 4px solid #f97316; padding: 20px; margin: 24px 0; border-radius: 8px;">
                                        <p style="margin: 0; color: #e5e7eb; font-size: 15px; line-height: 1.6;">
                                            <strong style="color: #f97316;">What's next?</strong><br>
                                            Explore our latest articles, share your basketball insights, create posts, engage with comments, and connect with fellow basketball enthusiasts from around the world.
                                        </p>
                                    </div>
                                    
                                    <p style="margin: 24px 0 0; color: #d1d5db; font-size: 16px; line-height: 1.6;">
                                        Got questions or need assistance? We're always here to help!
                                    </p>
                                    
                                    <div style="text-align: center; margin: 32px 0;">
                                        <a href="#" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">
                                            Start Exploring
                                        </a>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 30px; background: rgba(0, 0, 0, 0.3); border-radius: 0 0 16px 16px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                                    <p style="margin: 0 0 8px; color: #9ca3af; font-size: 14px; text-align: center;">
                                        Game on! 🏀
                                    </p>
                                    <p style="margin: 0; color: #9ca3af; font-size: 14px; font-weight: 600; text-align: center;">
                                        The HoopScoop Team
                                    </p>
                                    <p style="margin: 16px 0 0; color: #6b7280; font-size: 12px; text-align: center; line-height: 1.4;">
                                        This email was sent to ${user.email}<br>
                                        © ${new Date().getFullYear()} HoopScoop. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
      `,
    });

    res.json({
      message: "Email verified successfully",
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: "Verification failed" });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Check if account is locked
    if (user.otpLockUntil && user.otpLockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.otpLockUntil - Date.now()) / 60000);
      return res.status(429).json({
        message: `Account is locked. Please try again in ${minutesLeft} minutes.`,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    user.emailOtp = hashedOtp;
    user.emailOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otpAttempts = 0; // Reset attempts on new OTP
    user.otpLockUntil = undefined; // Remove any lock
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "New Verification Code - HoopScoop",
      html: `
        <h2>New Email Verification Code</h2>
        <p>Your new OTP is:</p>
        <h1>${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>You have 5 attempts to verify your email.</p>
      `,
    });

    res.json({ message: "New OTP sent to your email" });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};

exports.login = async (req, res) => {
  try {
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: formatZodErrors(validationResult.error),
      });
    }

    const { email, password } = validationResult.data;

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }, // matches frontend cookie maxAge
    );

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};
