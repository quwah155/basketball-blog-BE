const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { createPostSchema, commentSchema } = require("../utils/validation");
const { formatZodErrors } = require("../utils/zodHelpers");
const mongoose = require("mongoose");

// Get all posts (filtered by status based on user role)
exports.getAllPosts = async (req, res) => {
  try {
    const userRole = req.user?.role;

    // Admins see all posts, users only see APPROVED posts
    const whereClause = userRole === "ADMIN" ? {} : { status: "APPROVED" };

    const posts = await Post.find(whereClause)
      .populate("authorId", "email role")
      .populate({
        path: "comments",
        populate: {
          path: "authorId",
          select: "email", 
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Transform to match Prisma output format
    const transformedPosts = posts.map((post) => ({
      ...post,
      id: post._id.toString(),
      author: post.authorId
        ? {
            id: post.authorId._id.toString(),
            email: post.authorId.email,
            role: post.authorId.role,
          }
        : null,
      comments:
        post.comments?.map((comment) => ({
          ...comment,
          id: comment._id.toString(),
          author: comment.authorId
            ? {
                email: comment.authorId.email,
              }
            : null,
        })) || [],
    }));

    res.json(transformedPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching posts" });
  }
};

// Get single post
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findById(id)
      .populate("authorId", "email")
      .populate({
        path: "comments",
        populate: {
          path: "authorId",
          select: "email",
        },
        options: { sort: { createdAt: -1 } },
      })
      .lean();

    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if user can view this post
    if (post.status !== "APPROVED") {
      // Only author or admin can view non-approved posts
      if (
        req.user?.id !== post.authorId._id.toString() &&
        req.user?.role !== "ADMIN"
      ) {
        return res
          .status(403)
          .json({ message: "You do not have permission to view this post" });
      }
    }

    // Transform to match Prisma output format
    const transformedPost = {
      ...post,
      id: post._id.toString(),
      author: post.authorId
        ? {
            id: post.authorId._id.toString(),
            email: post.authorId.email,
          }
        : null,
      comments:
        post.comments?.map((comment) => ({
          ...comment,
          id: comment._id.toString(),
          author: comment.authorId
            ? {
                email: comment.authorId.email,
              }
            : null,
        })) || [],
    };

    res.json(transformedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching post" });
  }
};

// Create post (All authenticated users)
exports.createPost = async (req, res) => {
  try {
    // Validate input
    const validationResult = createPostSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: formatZodErrors(validationResult.error),
      });
    }

    const { title, summary, content, category, image } = validationResult.data;

    // Set status based on user role: ADMIN = APPROVED, USER = PENDING
    const status = req.user.role === "ADMIN" ? "APPROVED" : "PENDING";

    const post = new Post({
      title,
      summary,
      content,
      category,
      image:
        image ||
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1000",
      status,
      authorId: req.user.id,
    });

    await post.save();

    res.status(201).json({
      ...post.toObject(),
      id: post._id.toString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating post" });
  }
};

// Update post (User can edit their own posts)
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // Check if post exists and user owns it
    const existingPost = await Post.findById(id);

    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (
      existingPost.authorId.toString() !== req.user.id &&
      req.user.role !== "ADMIN"
    ) {
      return res
        .status(403)
        .json({ message: "You can only edit your own posts" });
    }

    // Validate input
    const validationResult = createPostSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: formatZodErrors(validationResult.error),
      });
    }

    const { title, summary, content, category, image } = validationResult.data;

    // When user edits, set status back to PENDING (unless admin)
    const status = req.user.role === "ADMIN" ? existingPost.status : "PENDING";

    existingPost.title = title;
    existingPost.summary = summary;
    existingPost.content = content;
    existingPost.category = category;
    existingPost.image = image ?? existingPost.image; // preserve existing image if not provided
    existingPost.status = status;

    await existingPost.save();

    res.json({
      ...existingPost.toObject(),
      id: existingPost._id.toString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating post" });
  }
};

// Get user's own posts
exports.getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ authorId: req.user.id })
      .populate("authorId", "email")
      .sort({ updatedAt: -1 })
      .lean();

    // Transform to match Prisma output format
    const transformedPosts = posts.map((post) => ({
      ...post,
      id: post._id.toString(),
      author: post.authorId
        ? {
            id: post.authorId._id.toString(),
            email: post.authorId.email,
          }
        : null,
    }));

    res.json(transformedPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching your posts" });
  }
};

// Get pending posts (Admin only)
exports.getPendingPosts = async (req, res) => {
  try {
    const posts = await Post.find({ status: "PENDING" })
      .populate("authorId", "email")
      .sort({ createdAt: -1 })
      .lean();

    // Transform to match Prisma output format
    const transformedPosts = posts.map((post) => ({
      ...post,
      id: post._id.toString(),
      author: post.authorId
        ? {
            id: post.authorId._id.toString(),
            email: post.authorId.email,
          }
        : null,
    }));

    res.json(transformedPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching pending posts" });
  }
};

// Approve post (Admin only)
exports.approvePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findByIdAndUpdate(
      id,
      { status: "APPROVED" },
      { new: true },
    ).lean();

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({
      message: "Post approved successfully",
      post: {
        ...post,
        id: post._id.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error approving post" });
  }
};

// Reject post (Admin only)
exports.rejectPost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findByIdAndUpdate(
      id,
      { status: "REJECTED" },
      { new: true },
    ).lean();

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({
      message: "Post rejected",
      post: {
        ...post,
        id: post._id.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error rejecting post" });
  }
};

// Delete post (Author or Admin)
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.authorId.toString() !== req.user.id && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this post" });
    }

    await Post.findByIdAndDelete(id);

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting post" });
  }
};

// Add comment (Authenticated users)
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // Validate input
    const validationResult = commentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: formatZodErrors(validationResult.error),
      });
    }

    const { text } = validationResult.data;

    const comment = new Comment({
      text,
      postId: id,
      authorId: req.user.id,
    });

    await comment.save();
    await comment.populate("authorId", "email");

    res.status(201).json({
      ...comment.toObject(),
      id: comment._id.toString(),
      author: comment.authorId
        ? {
            email: comment.authorId.email,
          }
        : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding comment" });
  }
};

// Like / Unlike post (Authenticated users — one like per user)
exports.likePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const userId = req.user.id;

    // Check if user already liked this post
    const existing = await Post.findById(id).select("likedBy");
    if (!existing) return res.status(404).json({ message: "Post not found" });

    const alreadyLiked = existing.likedBy.some(
      (uid) => uid.toString() === userId,
    );

    const update = alreadyLiked
      ? { $pull: { likedBy: userId }, $inc: { likes: -1 } } // unlike
      : { $addToSet: { likedBy: userId }, $inc: { likes: 1 } }; // like

    const post = await Post.findByIdAndUpdate(id, update, { new: true });

    res.json({
      likes: post.likes,
      liked: !alreadyLiked,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error liking post" });
  }
};
