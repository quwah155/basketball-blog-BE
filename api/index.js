// Vercel serverless entry point.
// Vercel looks for a handler in api/index.js and passes each request to it.
// server.js exports a serverless-compatible async handler — we just re-export it.
module.exports = require("../server.js");
