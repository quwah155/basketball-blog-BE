const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");

// Strict limiter for abuse-prone endpoints (register, resend-OTP)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Relaxed limiter for login (users legitimately retry more often)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { message: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", strictLimiter, authController.register);
router.post("/verify-email", authController.verifyEmail); // OTP already has attempt tracking
router.post("/resend-otp", strictLimiter, authController.resendOtp);
router.post("/login", loginLimiter, authController.login);

module.exports = router;
