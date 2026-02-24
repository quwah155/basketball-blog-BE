const { z } = require("zod");

// User registration schema
const registerSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, "Email must be at most 100 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  // Note: role is NOT accepted from clients — always defaults to 'USER'
});

// User login schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Post creation schema
const createPostSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be at most 200 characters"),
  summary: z
    .string()
    .min(10, "Summary must be at least 10 characters")
    .max(500, "Summary must be at most 500 characters"),
  content: z
    .string()
    .min(50, "Content must be at least 50 characters")
    .max(10000, "Content is too long"),
  category: z
    .string()
    .min(2, "Category must be at least 2 characters")
    .max(50, "Category must be at most 50 characters"),
  image: z.string().url("Invalid image URL").optional(),
});

// Comment schema
const commentSchema = z.object({
  text: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment is too long"),
});

module.exports = {
  registerSchema,
  loginSchema,
  createPostSchema,
  commentSchema,
};
