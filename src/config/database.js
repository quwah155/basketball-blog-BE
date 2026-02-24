const mongoose = require("mongoose");

// Cache the connection promise so Vercel serverless functions reuse it
// across warm invocations rather than opening a new connection each time.
let connectionPromise = null;

const connectDB = async () => {
  // Already connected — reuse existing connection
  if (mongoose.connection.readyState === 1) return;

  // Connection in progress — await the existing promise
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(process.env.MONGODB_URI)
    .then((cnct) => {
      console.log(`✅ MongoDB connected: ${cnct.connection.host}`);
    })
    .catch((error) => {
      connectionPromise = null; // reset so the next call retries
      console.error("❌ MongoDB connection error:", error.message);
      throw error;
    });

  return connectionPromise;
};

module.exports = connectDB;
