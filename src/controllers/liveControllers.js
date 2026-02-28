"use strict";

/**
 * liveController.js
 * Fetches NBA games from the BallDontLie API for a given date (defaults to today ET).
 * Uses node-fetch@2 (CJS compatible) to guarantee fetch availability on all Node versions.
 * Caches each date's result in a Map for 60 seconds.
 */

const fetch = require("node-fetch");

const CACHE_TTL_MS = 60_000; // 60 seconds

/** @type {Map<string, { data: object, timestamp: number }>} */
const cache = new Map();

/**
 * Returns today's date in ET (Eastern Time, UTC-5) as "YYYY-MM-DD".
 * Uses Intl.DateTimeFormat so it is correct on every system timezone,
 * including Vercel (UTC) and Windows local machines.
 */
function getTodayET() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Validate YYYY-MM-DD */
function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

/** Transform a raw BallDontLie game object into our clean shape.
 *
 * BallDontLie v1 reality (confirmed by live API inspection):
 *   status = ISO datetime string e.g. "2026-02-28T00:00:00Z" for ALL games
 *   period  = 0   → game hasn't started yet (upcoming)
 *   period  > 0   → game is in progress or finished
 *   status becomes "Final"/"Final/OT" only after the game ends
 *
 * Reliable mapping:
 *   period === 0 + not "Final"  → upcoming
 *   status starts with "Final"  → final
 *   period > 0 + not "Final"    → live (in progress)
 */
function transformGame(game) {
  const raw = (game.status || "").trim();
  const lower = raw.toLowerCase();
  const period = game.period ?? 0;

  let status;
  if (
    lower === "final" ||
    lower.startsWith("final/") ||
    lower.startsWith("final ")
  ) {
    status = "final";
  } else if (period === 0) {
    // period:0 means the game hasn't tipped off — status is an ISO kickoff datetime
    status = "upcoming";
  } else {
    // period > 0 and not final — actively in progress
    status = "live";
  }

  // Parse the ISO datetime into a readable kickoff time for upcoming games
  let kickoff = null;
  if (status === "upcoming") {
    try {
      kickoff =
        new Date(raw).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/New_York",
          hour12: true,
        }) + " ET";
    } catch {
      /* leave null if not a valid ISO string */
    }
  }

  return {
    id: game.id,
    homeTeam: {
      id: game.home_team?.id,
      name: game.home_team?.full_name || game.home_team?.name,
      abbreviation: game.home_team?.abbreviation,
      conference: game.home_team?.conference,
    },
    awayTeam: {
      id: game.visitor_team?.id,
      name: game.visitor_team?.full_name || game.visitor_team?.name,
      abbreviation: game.visitor_team?.abbreviation,
      conference: game.visitor_team?.conference,
    },
    homeScore: game.home_team_score ?? null,
    awayScore: game.visitor_team_score ?? null,
    status,
    period: game.period ?? null,
    clock: game.time ?? null,
    datetime: game.datetime ?? game.date ?? null,
    kickoff, // parsed "7:30 PM ET" string for upcoming games, null otherwise
  };
}

/**
 * GET /api/live-scores?date=YYYY-MM-DD  (defaults to today ET)
 */
async function getLiveScores(req, res) {
  try {
    const dateParam = req.query.date;
    let targetDate;

    if (dateParam) {
      if (!isValidDate(dateParam)) {
        return res
          .status(400)
          .json({ message: "Invalid date. Use YYYY-MM-DD." });
      }
      targetDate = dateParam;
    } else {
      targetDate = getTodayET();
    }

    const now = Date.now();
    const cached = cache.get(targetDate);

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return res.json({ ...cached.data, fromCache: true });
    }

    const apiKey = process.env.BALLDONTLIE_API_KEY;
    if (!apiKey) {
      console.error("BALLDONTLIE_API_KEY is not set in environment variables.");
      return res
        .status(500)
        .json({ message: "BALLDONTLIE_API_KEY not configured on server." });
    }

    const url = `https://api.balldontlie.io/v1/games?dates[]=${targetDate}&per_page=100`;
    console.log(`[LiveScores] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[LiveScores] BallDontLie API ${response.status}:`, text);
      // Serve stale cache rather than returning an error to the client
      if (cached) {
        return res.json({ ...cached.data, fromCache: true, stale: true });
      }
      return res.status(502).json({
        message: `Upstream API error: ${response.status}`,
        detail: text,
      });
    }

    const json = await response.json();
    console.log(
      `[LiveScores] ${json.data?.length ?? 0} games on ${targetDate}`,
    );

    const games = (json.data || []).map(transformGame);

    const grouped = {
      date: targetDate,
      live: games.filter((g) => g.status === "live"),
      final: games.filter((g) => g.status === "final"),
      upcoming: games.filter((g) => g.status === "upcoming"),
      lastUpdated: new Date().toISOString(),
      fromCache: false,
    };

    cache.set(targetDate, { data: grouped, timestamp: now });
    return res.json(grouped);
  } catch (err) {
    console.error("[LiveScores] Unexpected error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", detail: err.message });
  }
}

module.exports = { getLiveScores };
