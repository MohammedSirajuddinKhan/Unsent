const express = require("express");
const router = express.Router();
const passport = require("passport");
const mainController = require("../controllers/mainController.js");
const noteController = require("../controllers/noteController.js");
const authController = require("../controllers/authController.js");
const { ensureAuthenticated } = require("../middleware/auth");

function getGoogleCallbackUrl(req) {
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

  return `${forwardedProto}://${forwardedHost}/auth/google/callback`;
}

// Home page
router.get("/", mainController.homepage);
router.get("/login", mainController.homepage);

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

    res.redirect("/");
  },
);

router.get("/logout", authController.logout);

router.get("/notes/new", ensureAuthenticated, noteController.newNote);
router.post("/notes", ensureAuthenticated, noteController.createNote);
router.get("/notes/:id", ensureAuthenticated, noteController.showNote);
router.get("/notes/:id/edit", ensureAuthenticated, noteController.editNote);
router.put("/notes/:id", ensureAuthenticated, noteController.updateNote);
router.delete("/notes/:id", ensureAuthenticated, noteController.deleteNote);

module.exports = router;
