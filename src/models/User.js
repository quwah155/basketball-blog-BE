const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },
    emailOtp: {
      type: String,
    },
    emailOtpExpires: {
      type: Date,
    },
    otpAttempts: { type: Number, default: 0 },
    otpLockUntil: { type: Date },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailOtp;
  delete userObject.emailOtpExpires;
  return userObject;
};

// Virtual field for posts
userSchema.virtual("posts", {
  ref: "Post",
  localField: "_id",
  foreignField: "authorId",
});

// Virtual field for comments
userSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "authorId",
});

// Include virtuals when converting to JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const User = mongoose.model("User", userSchema);

module.exports = User;
