require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./src/config/database");
const authRoutes = require("./src/routes/authRoutes");
const postRoutes = require("./src/routes/postRoutes");
const adminRoutes = require("./src/routes/admin");
const liveRoutes = require("./src/routes/liveRoutes");

const app = express();

// Trust proxy — required for express-rate-limit behind Vercel/proxies
app.set("trust proxy", 1);

// Security headers
app.use(helmet());


const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = curl/Postman — allow
      if (!origin) return callback(null, true);
      // Explicit allowlist (localhost + FRONTEND_URL)
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Any *.vercel.app subdomain — covers all Vercel preview/prod deployments
      if (/^https:\/\/[^.]+\.vercel\.app$/.test(origin))
        return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
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
app.use("/api", authRoutes); // /api/login, /api/register, etc.
app.use("/api/posts", postRoutes); // /api/posts/**
app.use("/api/admin", adminRoutes); // /api/admin/**
app.use("/api/live-scores", liveRoutes); // /api/live-scores

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
