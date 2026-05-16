module.exports = function isAdmin(req, res, next) {
  if (!req.user || !req.user.email) {
    return res.status(403).send("Forbidden");
  }

  const env = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = String(req.user.email || "").toLowerCase();

  if (req.user.isAdmin) {
    return next();
  }

  if (env.length && env.includes(userEmail)) {
    return next();
  }

  return res.status(403).send("Forbidden");
};
