const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  authorize,
} = require("../middleware/authMiddleware");
const User = require("../models/User");

// Admin route to get all users
router.get(
  "/users",
  authenticateToken,
  authorize("ADMIN"),
  async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  }, 
);

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Promote or demote user
 * @access  Admin only
 */

router.put(
  "/users/:id/role",
  authenticateToken,
  authorize("ADMIN"),
  async (req, res) => {
    try {
      const { role } = req.body;

      if (!["USER", "ADMIN"].includes(role)) {
        return res.status(400).json({
          message: "Invalid role",
        });
      }
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      user.role = role;
      await user.save();

      res.json({
        message: `User role updated to ${role}`,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error updating user role",
      });
    }
  },
);

module.exports = router;
