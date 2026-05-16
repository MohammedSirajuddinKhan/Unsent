const express = require("express");
const router = express.Router();
const passport = require("passport");
const mainController = require("../controllers/mainController.js");
const noteController = require("../controllers/noteController.js");
const authController = require("../controllers/authController.js");
const User = require("../models/User");
const { ensureAuthenticated } = require("../middleware/auth");
const checkBanned = require("../middleware/checkBanned");
const isAdmin = require("../middleware/isAdmin");
const upload = require("../middleware/upload");
const adminController = require("../controllers/adminController");

// Development-only debug route to inspect session and user state
if (process.env.NODE_ENV !== "production") {
  router.get("/__debug/session", (req, res) => {
    res.json({
      user: req.user || null,
      session: req.session || null,
      cookies: req.headers.cookie || null,
    });
  });
}

function getGoogleCallbackUrl(req) {
  // Prefer an explicit environment override if it's a valid http(s) URL
  const envUrl = String(process.env.GOOGLE_CALLBACK_URL || "").trim();
  const isValidHttpUrl = (value) => {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  };

  if (envUrl && isValidHttpUrl(envUrl)) {
    return envUrl;
  }

  const forwardedProto = (
    req.headers["x-forwarded-proto"] ||
    req.protocol ||
    "https"
  )
    .split(",")[0]
    .trim();
  const forwardedHost = (
    req.headers["x-forwarded-host"] ||
    req.get("host") ||
    ""
  )
    .split(",")[0]
    .trim();

  const computed = `${forwardedProto}://${forwardedHost}/auth/google/callback`;

  // If computed value doesn't look like a valid URL, fall back to localhost
  if (!isValidHttpUrl(computed)) {
    console.warn(
      "Computed Google callback URL is invalid, falling back to localhost",
    );
    return "http://localhost:3000/auth/google/callback";
  }

  return computed;
}

// Home page
router.get("/", checkBanned, mainController.homepage);
router.get("/login", checkBanned, mainController.homepage);

router.get("/auth/google", (req, res, next) =>
  passport.authenticate("google", {
    scope: ["profile", "email"],
    callbackURL: getGoogleCallbackUrl(req),
  })(req, res, next),
);
router.get(
  "/auth/google/callback",
  (req, res, next) =>
    passport.authenticate("google", {
      failureRedirect: "/",
      callbackURL: getGoogleCallbackUrl(req),
    })(req, res, next),
  (req, res) => {
    if (res.flash) {
      res.flash("success", "Signed in successfully.");
    }
    // If the signed-in user's email is listed in ADMIN_EMAILS, persist `isAdmin` on their account.
    try {
      const env = String(process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const userEmail = String(req.user?.email || "").toLowerCase();

      if (env.length && env.includes(userEmail) && req.user && req.user._id) {
        (async () => {
          try {
            await User.findByIdAndUpdate(req.user._id, { isAdmin: true });
          } catch (e) {
            console.error("Failed to persist admin flag for user", e);
          }
        })();
      }
    } catch (e) {
      console.error(e);
    }

    // If user is banned, log them out and prevent signin
    try {
      if (req.user && req.user.isBanned) {
        // capture user info before logging out
        const bannedUser = {
          displayName: req.user.displayName || null,
          email: req.user.email || null,
        };

        const adminEmails = (process.env.ADMIN_EMAILS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        try {
          return req.logout(() => {
            // render banned page with negative styling
            return res.status(403).render("banned", {
              title: "Account banned",
              description: "Banned",
              user: bannedUser,
              adminEmails,
            });
          });
        } catch (e) {
          console.error("Error logging out banned user", e);
          return res.status(403).render("banned", {
            title: "Account banned",
            description: "Banned",
            user: bannedUser,
            adminEmails,
          });
        }
      }
    } catch (e) {
      console.error("Error checking ban status", e);
    }

    res.redirect("/");
  },
);

router.get("/logout", authController.logout);

router.get(
  "/notes/new",
  ensureAuthenticated,
  checkBanned,
  noteController.newNote,
);
router.post(
  "/notes",
  ensureAuthenticated,
  checkBanned,
  upload.single("image"),
  noteController.createNote,
);
router.get(
  "/notes/:id",
  ensureAuthenticated,
  checkBanned,
  noteController.showNote,
);
router.get(
  "/notes/:id/edit",
  ensureAuthenticated,
  checkBanned,
  noteController.editNote,
);
router.put(
  "/notes/:id",
  ensureAuthenticated,
  checkBanned,
  upload.single("image"),
  noteController.updateNote,
);
router.delete(
  "/notes/:id",
  ensureAuthenticated,
  checkBanned,
  noteController.deleteNote,
);

// Admin
router.get(
  "/admin",
  ensureAuthenticated,
  checkBanned,
  isAdmin,
  adminController.index,
);
router.post(
  "/admin/notes/:id/delete",
  ensureAuthenticated,
  checkBanned,
  isAdmin,
  adminController.deleteNote,
);
router.post(
  "/admin/users/:id/delete",
  ensureAuthenticated,
  checkBanned,
  isAdmin,
  adminController.deleteUser,
);
router.post(
  "/admin/users/:id/toggle-admin",
  ensureAuthenticated,
  checkBanned,
  isAdmin,
  adminController.toggleAdmin,
);
router.post(
  "/admin/users/:id/toggle-ban",
  ensureAuthenticated,
  checkBanned,
  isAdmin,
  adminController.toggleBan,
);
router.get(
  "/admin/users/:id",
  ensureAuthenticated,
  checkBanned,
  isAdmin,
  adminController.userNotes,
);
router.post(
  "/admin/users/:id/toggle-admin",
  ensureAuthenticated,
  checkBanned,
  isAdmin,
  adminController.toggleAdmin,
);

module.exports = router;
