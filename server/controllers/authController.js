exports.logout = (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }

    if (res.flash) {
      res.flash("success", "You have been logged out.");
    }

    req.session.save((saveError) => {
      if (saveError) {
        return next(saveError);
      }

      res.redirect("/");
    });
  });
};
