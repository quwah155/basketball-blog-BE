require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const connectDB = require("./src/config/database");
const authRoutes = require("./src/routes/authRoutes");
const postRoutes = require("./src/routes/postRoutes");
const adminRoutes = require("./src/routes/admin");

const app = express();


app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());


app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});


app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/admin", adminRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Internal Server Error",
  });
});


if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;

  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err);
      process.exit(1);
    });
}


module.exports = async (req, res) => {
  await connectDB(); 
  return app(req, res);
};
