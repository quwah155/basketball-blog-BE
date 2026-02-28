const mongoose = require("mongoose");

let connectionPromise = null;

const connectDB = async () => {

  if (mongoose.connection.readyState === 1) return;

  
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
