const Note = require("../models/Note");
const User = require("../models/User");
const mongoose = require("mongoose");

exports.index = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const perPage = 20;
    const q = String(req.query.q || "").trim();

    const filter = {};
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: re }, { body: re }];
    }

    const total = await Note.countDocuments(filter);
    const notes = await Note.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("user", "displayName email")
      .lean();

    const users = await User.find().sort({ createdAt: -1 }).limit(200).lean();

    res.render("admin/index", {
      title: "Admin Dashboard",
      description: "Administration",
      notes,
      users,
      q,
      page,
      total,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) {
      req.flash && req.flash("error", "Note not found");
      return res.redirect("/admin");
    }
    req.flash && req.flash("success", "Note deleted");
    return res.redirect("/admin");
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    await Note.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);
    req.flash && req.flash("success", "User and their notes deleted");
    return res.redirect("/admin");
  } catch (err) {
    next(err);
  }
};

exports.toggleAdmin = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      req.flash && req.flash("error", "User not found");
      return res.redirect("/admin");
    }
    user.isAdmin = !user.isAdmin;
    await user.save();
    req.flash &&
      req.flash(
        "success",
        `User ${user.isAdmin ? "promoted" : "demoted"} successfully`,
      );
    return res.redirect("/admin");
  } catch (err) {
    next(err);
  }
};

exports.toggleBan = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      req.flash && req.flash("error", "User not found");
      return res.redirect("/admin");
    }
    user.isBanned = !user.isBanned;
    await user.save();
    // If the user was just banned, attempt to remove their active sessions
    if (user.isBanned) {
      try {
        const db = mongoose.connection && mongoose.connection.db;
        if (db) {
          const sessions = db.collection("sessions");
          // Remove any session documents that reference this user's id.
          // Sessions stored by connect-mongo contain a `session` field
          // with serialized JSON; use a regex to match the user id.
          await sessions.deleteMany({ session: { $regex: userId } });
        }
      } catch (err) {
        console.warn(
          "Failed to clear sessions for banned user:",
          err && err.message ? err.message : err,
        );
      }
    }

    req.flash &&
      req.flash(
        "success",
        `User ${user.isBanned ? "banned" : "unbanned"} successfully`,
      );
    return res.redirect("/admin");
  } catch (err) {
    next(err);
  }
};

exports.userNotes = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).send("User not found");
    }
    const notes = await Note.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.render("admin/user", {
      title: `Notes for ${user.displayName || user.email}`,
      description: "User notes",
      user,
      notes,
    });
  } catch (err) {
    next(err);
  }
};
