const GoogleStrategy = require("passport-google-oauth2").Strategy;

const User = require("../models/User");

module.exports = function configurePassport(passport) {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).lean();
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:3000/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || "";
          const userData = {
            googleId: profile.id,
            displayName:
              profile.displayName || email.split("@")[0] || "Google User",
            email,
            photo: profile.photos?.[0]?.value || "",
          };

          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            user.displayName = userData.displayName;
            user.email = userData.email;
            user.photo = userData.photo;
            await user.save();
            return done(null, user);
          }

          user = await User.create(userData);
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
};
