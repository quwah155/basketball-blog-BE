# 🏀 HoopScoop — Backend API

A RESTful backend API powering the HoopScoop basketball blog. Built with **Node.js**, **Express**, and **MongoDB (Mongoose)**, with JWT-based authentication, OTP email verification, role-based access control, and a post approval workflow.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Authentication Flow](#authentication-flow)
- [Role-Based Access Control](#role-based-access-control)
- [Post Approval Workflow](#post-approval-workflow)
- [Admin Setup](#admin-setup)
- [Utility Scripts](#utility-scripts)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)

---

## 🛠 Tech Stack

| Layer            | Technology                        |
| ---------------- | --------------------------------- |
| Runtime          | Node.js                           |
| Framework        | Express v5                        |
| Database         | MongoDB Atlas via Mongoose v8     |
| Authentication   | JSON Web Tokens (`jsonwebtoken`)  |
| Password Hashing | `bcryptjs`                        |
| Validation       | `zod`                             |
| Email            | `nodemailer` (Gmail App Password) |
| Rate Limiting    | `express-rate-limit`              |
| Dev Server       | `nodemon`                         |

---

## 📁 Project Structure

```
basketball-blog-BE/
├── server.js                   # App entry point, middleware, route mounting
├── .env                        # Secret environment variables (never commit)
├── .env.example                # Template for environment variables
├── src/
│   ├── config/
│   │   └── database.js         # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # register, verifyEmail, resendOtp, login
│   │   └── postController.js   # CRUD, approve/reject, comments, likes
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification + role authorization
│   ├── models/
│   │   ├── User.js             # User schema (email, password, role, isVerified, OTP fields)
│   │   ├── Post.js             # Post schema (title, content, status, likes, likedBy)
│   │   └── Comment.js          # Comment schema (text, postId, authorId)
│   ├── routes/
│   │   ├── authRoutes.js       # /api/register, /api/login, /api/verify-email, /api/resend-otp
│   │   ├── postRoutes.js       # /api/posts — CRUD + admin actions
│   │   └── admin.js            # /api/admin — user management
│   └── utils/
│       ├── sendEmail.js        # Nodemailer email helper
│       ├── validation.js       # Zod schemas for request validation
│       └── zodHelpers.js       # Format Zod errors into readable messages
├── seedAdmin.js                # Create the initial admin account
├── fixAdminVerified.js         # One-time patch: set isVerified=true on all admins
├── updateAdminPassword.js      # One-time patch: update admin password
└── checkPosts.js               # Debugging utility: list all posts in DB
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+ and npm
- A MongoDB Atlas account (or a local MongoDB instance)
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) for sending verification emails

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd basketball-blog-BE

# Install dependencies
npm install

# Copy the environment template and fill in your values
cp .env.example .env
```

### Running the Server

```bash
# Development (with hot reload via nodemon)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:5000` by default (configurable via `PORT` in `.env`).

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in all values.

| Variable             | Description                                            | Example                       |
| -------------------- | ------------------------------------------------------ | ----------------------------- |
| `NODE_ENV`           | App environment (`development` or `production`)        | `development`                 |
| `PORT`               | Port the server listens on                             | `5000`                        |
| `FRONTEND_URL`       | Frontend origin for CORS (must match exactly)          | `http://localhost:5173`       |
| `MONGODB_URI`        | MongoDB Atlas connection string                        | `mongodb+srv://user:pass@...` |
| `JWT_SECRET`         | Secret key used to sign/verify JWTs (keep this strong) | `a-long-random-secret-string` |
| `EMAIL_USER`         | Gmail address used to send verification emails         | `you@gmail.com`               |
| `EMAIL_APP_PASSWORD` | Gmail App Password (not your normal password)          | `xxxx xxxx xxxx xxxx`         |
| `ADMIN_EMAIL`        | Email used to seed the initial admin account           | `admin@yourdomain.com`        |
| `ADMIN_PASSWORD`     | Password for the initial admin account                 | `YourSecurePassword!`         |

> **Security:** Never commit your `.env` file. It is listed in `.gitignore`.

---

## 📡 API Reference

### Auth Routes — `/api`

| Method | Endpoint            | Auth Required | Description                              |
| ------ | ------------------- | ------------- | ---------------------------------------- |
| POST   | `/api/register`     | No            | Register new user, sends OTP to email    |
| POST   | `/api/verify-email` | No            | Verify email with OTP, returns JWT       |
| POST   | `/api/resend-otp`   | No            | Resend OTP to email                      |
| POST   | `/api/login`        | No            | Login with email + password, returns JWT |

### Post Routes — `/api/posts`

| Method | Endpoint                   | Auth Required  | Role        | Description                                         |
| ------ | -------------------------- | -------------- | ----------- | --------------------------------------------------- |
| GET    | `/api/posts`               | Yes (optional) | Any         | Get posts (ADMIN sees all, USER sees APPROVED only) |
| GET    | `/api/posts/user/my-posts` | Yes            | Any         | Get current user's own posts                        |
| GET    | `/api/posts/admin/pending` | Yes            | ADMIN       | Get all PENDING posts                               |
| GET    | `/api/posts/:id`           | Yes (optional) | Any         | Get single post by ID                               |
| POST   | `/api/posts`               | Yes            | Any         | Create post (ADMIN = APPROVED, USER = PENDING)      |
| PUT    | `/api/posts/:id`           | Yes            | Owner/Admin | Update post                                         |
| DELETE | `/api/posts/:id`           | Yes            | Owner/Admin | Delete post                                         |
| POST   | `/api/posts/:id/comments`  | Yes            | Any         | Add a comment to a post                             |
| POST   | `/api/posts/:id/like`      | Yes            | Any         | Toggle like on a post                               |
| PATCH  | `/api/posts/:id/approve`   | Yes            | ADMIN       | Approve a pending post                              |
| PATCH  | `/api/posts/:id/reject`    | Yes            | ADMIN       | Reject a pending post                               |

### Admin Routes — `/api/admin`

| Method | Endpoint                    | Auth Required | Role  | Description              |
| ------ | --------------------------- | ------------- | ----- | ------------------------ |
| GET    | `/api/admin/users`          | Yes           | ADMIN | List all users           |
| PUT    | `/api/admin/users/:id/role` | Yes           | ADMIN | Promote or demote a user |

---

## 🔑 Authentication Flow

1. **Register** — User submits email + password. A hashed 6-digit OTP is stored in the DB and the plaintext OTP is emailed to the user.
2. **Verify Email** — User submits email + OTP. On success, `isVerified` is set to `true` and a signed JWT is returned. A welcome email is also sent.
3. **Login** — User submits email + password. Blocked if `isVerified` is `false`. Returns a signed JWT on success.
4. **Authenticated Requests** — JWT must be sent in the `Authorization` header as `Bearer <token>`.

**Token payload structure:**

```json
{
  "id": "user_mongodb_id",
  "email": "user@example.com",
  "role": "USER" | "ADMIN",
  "exp": 1234567890
}
```

Token expiry: **2 hours**.

---

## 🛡 Role-Based Access Control

Two roles exist in the system:

| Role    | Capabilities                                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------------- |
| `USER`  | Read approved posts, create posts (goes to PENDING), edit/delete own posts, comment, like                   |
| `ADMIN` | All USER permissions + view pending posts, approve/reject posts, manage all users, directly published posts |

The `authenticate Token` middleware always **fetches a fresh user document from the DB** on every request, so role changes take effect immediately without requiring a new token.

---

## 📝 Post Approval Workflow

```
User creates post
       │
       ▼
  status: PENDING
       │
       ▼
Admin reviews in dashboard
       │
  ┌────┴────┐
  ▼         ▼
APPROVED   REJECTED
(visible   (hidden from
 publicly)  public feed)
```

- **ADMIN posts** skip the queue and are immediately `APPROVED`.
- **USER posts** start as `PENDING` and are only visible to the post author and admins until approved.
- Editing an approved post by a USER resets its status back to `PENDING`.

---

## 👤 Admin Setup

The admin account is created by running a seed script — it does **not** go through the normal email verification flow.

```bash
# Make sure your .env has ADMIN_EMAIL and ADMIN_PASSWORD set, then:
node src/seedAdmin.js
```

If an admin account already exists with the same email, the script exits without changes.

### Fix Existing Unverified Admins

If an admin was seeded before the `isVerified: true` fix, run:

```bash
node src/fixAdminVerified.js
```

---

## 🛠 Utility Scripts

| Script                 | Command                           | Purpose                                  |
| ---------------------- | --------------------------------- | ---------------------------------------- |
| Seed admin user        | `node src/seedAdmin.js`           | Create the first admin account           |
| Fix admin verification | `node src/fixAdminVerified.js`    | Set `isVerified=true` on all admin users |
| Update admin password  | `node src/updateAdminPassword.js` | Change admin password directly in DB     |
| Check posts in DB      | `node src/checkPosts.js`          | Debug utility: list all posts            |

---

## 🚦 Rate Limiting

Rate limiting is applied per-route inside `authRoutes.js`:

| Endpoint            | Limit           | Reason                                         |
| ------------------- | --------------- | ---------------------------------------------- |
| `/api/register`     | 10 req / 15 min | Prevent mass account creation                  |
| `/api/resend-otp`   | 10 req / 15 min | Prevent OTP spam                               |
| `/api/login`        | 30 req / 15 min | Allow normal usage while blocking brute force  |
| `/api/verify-email` | No limiter      | OTP already has 5-attempt lockout + 30-min ban |

---

## ⚠️ Error Handling

All endpoints return consistent JSON error responses:

```json
{
  "message": "Human-readable error description",
  "errors": { "field": "Specific validation error" }
}
```

Common HTTP status codes used:

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 400  | Bad request / validation error       |
| 401  | Unauthenticated                      |
| 403  | Forbidden (wrong role or unverified) |
| 404  | Resource not found                   |
| 429  | Rate limit exceeded                  |
| 500  | Internal server error                |
