require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/database");
const authRoutes = require("./src/routes/authRoutes");
const postRoutes = require("./src/routes/postRoutes");
const adminRoutes = require("./src/routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — restrict to frontend origin in production
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// Routes — rate limiting is applied per-route inside authRoutes.js
app.use("/api", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/admin", adminRoutes);

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
