const express = require("express");
const router = express.Router();
const passport = require("passport");
const mainController = require("../controllers/mainController.js");
const noteController = require("../controllers/noteController.js");
const authController = require("../controllers/authController.js");
const { ensureAuthenticated } = require("../middleware/auth");

// Home page
router.get("/", mainController.homepage);
router.get("/login", mainController.homepage);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
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
