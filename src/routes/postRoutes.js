const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const {
  authenticateToken,
  authorize,
} = require("../middleware/authMiddleware");


  
// Public read — any visitor can browse approved posts
// authenticateToken is still used so logged-in users get role-aware results (e.g. admins see all statuses)
router.get("/", authenticateToken, postController.getAllPosts);

// My posts (must be before /:id or 'my-posts' is treated as an ID)
router.get("/user/my-posts", authenticateToken, postController.getMyPosts);

// Admin-only routes (must be before /:id or 'admin' is treated as an ID)
router.get(
  "/admin/pending",
  authenticateToken,
  authorize("ADMIN"),
  postController.getPendingPosts,
);

// ── Parameterised routes ──

// Single post
router.get("/:id", authenticateToken, postController.getPostById);

// User actions (all authenticated users)
router.post("/", authenticateToken, postController.createPost);
router.put("/:id", authenticateToken, postController.updatePost);
router.delete("/:id", authenticateToken, postController.deletePost);

// Comments & likes
router.post("/:id/comments", authenticateToken, postController.addComment);
router.post("/:id/like", authenticateToken, postController.likePost);

// Admin actions on specific posts
router.patch(
  "/:id/approve",
  authenticateToken,
  authorize("ADMIN"),
  postController.approvePost,
);
router.patch(
  "/:id/reject",
  authenticateToken,
  authorize("ADMIN"),
  postController.rejectPost,
);

module.exports = router;
