exports.logout = (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }

    if (res.flash) {
      res.flash("success", "You have been logged out.");
    }

    if (req.session && typeof req.session.save === "function") {
      req.session.save((saveError) => {
        if (saveError) {
          return next(saveError);
        }

        res.redirect("/");
      });

      return;
    }

    res.redirect("/");
  });
};
