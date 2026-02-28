
const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

const fix = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const setOp = {};
    setOp["$set"] = { isVerified: true };

    const result = await User.updateMany({ role: "ADMIN" }, setOp);

    const admins = await User.find({ role: "ADMIN" }).select(
      "email isVerified",
    );
    admins.forEach((a) => {
      console.log("  - " + a.email + ": isVerified=" + a.isVerified);
    });

    if (result.modifiedCount === 0) {
      console.log("All admins were already verified.");
    } else {
      console.log(
        "Patched " + result.modifiedCount + " admin(s) -> isVerified=true",
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("Error patching admin(s):", error);
    process.exit(1);
  }
};

fix();
