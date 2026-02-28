"use strict";

const express = require("express");
const router = express.Router();
const { getLiveScores } = require("../controllers/liveControllers");

// Public — no auth needed for scores
router.get("/", getLiveScores);

module.exports = router;
