# 🏀 HoopScoop — Backend API

A RESTful backend API powering the HoopScoop basketball blog. Built with **Node.js**, **Express**, and **MongoDB (Mongoose)**, with JWT-based authentication, OTP email verification, role-based access control, a post approval workflow, and live NBA scores via the BallDontLie API.

**Live API:** https://basketball-blog-be.vercel.app

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
- [Deploying to Vercel](#deploying-to-vercel)
- [Error Handling](#error-handling)

---

## 🛠 Tech Stack

| Layer            | Technology                        |
| ---------------- | --------------------------------- |
| Runtime          | Node.js v18+                      |
| Framework        | Express v5                        |
| Database         | MongoDB Atlas via Mongoose v8     |
| Authentication   | JSON Web Tokens (`jsonwebtoken`)  |
| Password Hashing | `bcryptjs`                        |
| Validation       | `zod`                             |
| Email            | `nodemailer` (Gmail App Password) |
| HTTP Fetch       | `node-fetch@2` (CJS compatible)   |
| Security Headers | `helmet`                          |
| Rate Limiting    | `express-rate-limit`              |
| Dev Server       | `nodemon`                         |
| Deployment       | Vercel (serverless functions)     |

---

## 📁 Project Structure

```
basketball-blog-BE/
├── server.js                    # App config, middleware, routes — dual-mode (local + Vercel)
├── api/
│   └── index.js                 # Vercel serverless entry point (re-exports server.js handler)
├── vercel.json                  # Vercel deployment config
├── .env                         # Secret environment variables (never commit)
├── .env.example                 # Template for environment variables
└── src/
    ├── config/
    │   └── database.js          # MongoDB connection with caching for serverless
    ├── controllers/
    │   ├── authController.js    # register, verifyEmail, resendOtp, login
    │   ├── postController.js    # CRUD, approve/reject, comments, likes
    │   └── liveControllers.js  # Live NBA scores: fetch, 60s Map cache, transform, group
    ├── middleware/
    │   └── authMiddleware.js    # JWT verification + role authorization
    ├── models/
    │   ├── User.js              # User schema (email, password, role, isVerified, OTP fields)
    │   ├── Post.js              # Post schema (title, content, status, likes, likedBy)
    │   └── Comment.js           # Comment schema (text, postId, authorId)
    ├── routes/
    │   ├── authRoutes.js        # /api/register, /api/login, /api/verify-email, /api/resend-otp
    │   ├── postRoutes.js        # /api/posts — CRUD + admin actions
    │   ├── admin.js             # /api/admin — user management
    │   └── liveRoutes.js        # /api/live-scores — public NBA scores endpoint
    └── utils/
        ├── sendEmail.js         # Nodemailer email helper
        ├── validation.js        # Zod schemas for request validation
        └── zodHelpers.js        # Format Zod errors into readable messages
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+ and npm
- A MongoDB Atlas account (or local MongoDB instance)
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) for sending verification emails
- A [BallDontLie API key](https://www.balldontlie.io/) for live NBA scores

### Installation

```bash
git clone <repo-url>
cd basketball-blog-BE
npm install
cp .env.example .env   # then fill in your values
```

### Running Locally

```bash
# Development (hot reload via nodemon)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:5000` by default (configurable via `PORT` in `.env`).

---

## 🔐 Environment Variables

| Variable              | Description                                     | Example                        |
| --------------------- | ----------------------------------------------- | ------------------------------ |
| `NODE_ENV`            | App environment (`development` or `production`) | `production`                   |
| `PORT`                | Port the server listens on (local only)         | `5000`                         |
| `FRONTEND_URL`        | Frontend origin for CORS                        | `https://hoopsqoop.vercel.app` |
| `MONGODB_URI`         | MongoDB Atlas connection string                 | `mongodb+srv://user:pass@...`  |
| `JWT_SECRET`          | Secret key for signing/verifying JWTs           | `a-long-random-secret-string`  |
| `EMAIL_USER`          | Gmail address for sending verification emails   | `you@gmail.com`                |
| `EMAIL_APP_PASSWORD`  | Gmail App Password (not your login password)    | `xxxx xxxx xxxx xxxx`          |
| `ADMIN_EMAIL`         | Email used to seed the initial admin account    | `admin@yourdomain.com`         |
| `ADMIN_PASSWORD`      | Password for the initial admin account          | `YourSecurePassword!`          |
| `BALLDONTLIE_API_KEY` | API key for the BallDontLie v1 NBA API          | `your_balldontlie_key_here`    |

> **Security:** Never commit your `.env` file. It is listed in `.gitignore`.

---

## 📡 API Reference

### Auth Routes — `/api`

| Method | Endpoint            | Auth Required | Description                              |
| ------ | ------------------- | ------------- | ---------------------------------------- |
| GET    | `/api/health`       | No            | Health check — returns `{status:"OK"}`   |
| POST   | `/api/register`     | No            | Register new user, sends OTP to email    |
| POST   | `/api/verify-email` | No            | Verify email with OTP, returns JWT       |
| POST   | `/api/resend-otp`   | No            | Resend OTP to email                      |
| POST   | `/api/login`        | No            | Login with email + password, returns JWT |

### Live Scores Route — `/api/live-scores`

| Method | Endpoint           | Auth Required | Description                                                                                                                 |
| ------ | ------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/live-scores` | No            | NBA games grouped into `live`, `final`, `upcoming`. Accepts `?date=YYYY-MM-DD` (defaults to today ET). Cached 60s per date. |

**Response shape:**

```json
{
  "date": "2026-02-27",
  "live":     [{ "id", "homeTeam", "awayTeam", "homeScore", "awayScore", "status", "period", "clock" }],
  "final":    [...],
  "upcoming": [{ "...", "kickoff": "7:30 PM ET" }],
  "lastUpdated": "2026-02-27T12:00:00.000Z",
  "fromCache": true
}
```

**Status detection** (based on confirmed BallDontLie v1 API behavior):

- `period === 0` → `upcoming` (API returns ISO datetime string as `status`)
- `status` starts with `"Final"` → `final`
- `period > 0` + not Final → `live`

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

1. **Register** — User submits email + password. A hashed 6-digit OTP is stored in the DB and emailed.
2. **Verify Email** — User submits email + OTP. On success, `isVerified` is set to `true` and a JWT is returned.
3. **Login** — User submits email + password. Blocked if `isVerified` is `false`. Returns a signed JWT.
4. **Authenticated Requests** — JWT must be sent in the `Authorization` header as `Bearer <token>`.

**Token payload:**

```json
{
  "id": "user_mongodb_id",
  "email": "user@example.com",
  "role": "USER | ADMIN",
  "exp": 1234567890
}
```

Token expiry: **2 hours**.

---

## 🛡 Role-Based Access Control

| Role    | Capabilities                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------- |
| `USER`  | Read approved posts, create posts (PENDING), edit/delete own posts, comment, like                        |
| `ADMIN` | All USER permissions + view pending posts, approve/reject, manage all users, posts published immediately |

The `authenticateToken` middleware always **fetches a fresh user document from the DB** on every request, so role changes take effect immediately without requiring a new token.

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
(public)   (hidden)
```

- **ADMIN posts** skip the queue and are immediately `APPROVED`.
- **USER posts** start as `PENDING` and are only visible to the author and admins until approved.
- Editing an approved post as a USER resets its status back to `PENDING`.

---

## 👤 Admin Setup

The admin account is created via a seed script — it bypasses normal email verification.

```bash
# Ensure ADMIN_EMAIL and ADMIN_PASSWORD are set in .env, then:
node src/seedAdmin.js
```

If an admin with the same email already exists, the script exits without changes.

### Fix Unverified Admins

If an admin was seeded before the `isVerified: true` fix was applied:

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

Applied per-route in `authRoutes.js`:

| Endpoint            | Limit           | Reason                                         |
| ------------------- | --------------- | ---------------------------------------------- |
| `/api/register`     | 10 req / 15 min | Prevent mass account creation                  |
| `/api/resend-otp`   | 10 req / 15 min | Prevent OTP spam                               |
| `/api/login`        | 30 req / 15 min | Allow normal usage while blocking brute force  |
| `/api/verify-email` | No limiter      | OTP already has 5-attempt lockout + 30-min ban |

---

## 🚀 Deploying to Vercel

This backend supports dual-mode operation:

- **Local dev** — `server.js` calls `app.listen()` when `NODE_ENV !== "production"`
- **Vercel** — `api/index.js` exports a serverless handler; `app.listen()` is never called

### Steps

1. Push the repo to GitHub.
2. Import the repo in [vercel.com](https://vercel.com) → set **Root Directory** to `basketball-blog-BE`.
3. Add all required environment variables in Vercel project settings.
4. Deploy. Vercel uses `vercel.json` to route all requests to `api/index.js`.

> **CORS Note:** The CORS config allows `localhost:5173/4173`, any explicit `FRONTEND_URL`, and any `*.vercel.app` subdomain — so all preview deployments work without changes.

> **Live Scores + Vercel:** The 60-second in-memory Map cache works per warm serverless instance. Cold starts re-fetch once cleanly — well within BallDontLie's free-tier rate limits since the frontend only calls the backend, never the external API directly.

---

## ⚠️ Error Handling

All endpoints return consistent JSON:

```json
{
  "message": "Human-readable error description",
  "errors": [{ "field": "fieldName", "message": "Specific validation error" }]
}
```

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 400  | Bad request / validation error       |
| 401  | Unauthenticated                      |
| 403  | Forbidden (wrong role or unverified) |
| 404  | Resource not found                   |
| 429  | Rate limit exceeded                  |
| 500  | Internal server error                |
| 502  | Upstream API error (Live Scores)     |
