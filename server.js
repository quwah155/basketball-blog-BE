require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./src/config/database");
const authRoutes = require("./src/routes/authRoutes");
const postRoutes = require("./src/routes/postRoutes");
const adminRoutes = require("./src/routes/admin");

const app = express();

// Trust proxy — required for express-rate-limit behind Vercel/proxies
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS — allow both the configured frontend URL and localhost for dev
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean); // remove undefined if FRONTEND_URL is not set

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman) and allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", env: process.env.NODE_ENV });
});

// Routes
app.use("/api", authRoutes); // /api/login, /api/register, /api/verify-email, /api/resend-otp
app.use("/api/posts", postRoutes); // /api/posts/**
app.use("/api/admin", adminRoutes); // /api/admin/**

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

// ── Local dev ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err);
      process.exit(1);
    });
}

// ── Vercel serverless export ──────────────────────────────────────────────────
// Vercel calls this for every request. connectDB() is idempotent — Mongoose
// reuses the existing connection on warm invocations.
module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};
