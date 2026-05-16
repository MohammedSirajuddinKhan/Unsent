module.exports = function checkBanned(req, res, next) {
  try {
    if (req.user && req.user.isBanned) {
      const userInfo = {
        displayName: req.user.displayName || null,
        email: req.user.email || null,
      };

      return res.status(403).render("banned", {
        title: "Account banned",
        description: "Access restricted",
        user: userInfo,
        adminEmails: (process.env.ADMIN_EMAILS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
    }
  } catch (e) {
    console.error("checkBanned middleware error", e);
  }

  return next();
};
