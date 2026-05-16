const GoogleStrategy = require("passport-google-oauth2").Strategy;

const User = require("../models/User");

module.exports = function configurePassport(passport) {
  // For serverless deployments using cookie sessions, store a small
  // user object in the session to avoid a DB lookup on every request
  // during cold starts. Fall back to id-based serialization for
  // non-serverless environments.
  const useCookieSession =
    !!process.env.VERCEL || process.env.USE_COOKIE_SESSION === "1";

  if (useCookieSession) {
    passport.serializeUser((user, done) => {
      const small = {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        photo: user.photo,
      };
      done(null, small);
    });

    passport.deserializeUser((obj, done) => {
      // If object (from cookie), return it directly. If it's an id
      // string, fall back to DB lookup for backwards compatibility.
      if (obj && typeof obj === "object" && obj.id) {
        return done(null, obj);
      }

      (async () => {
        try {
          const user = await User.findById(obj).lean();
          done(null, user);
        } catch (error) {
          done(error);
        }
      })();
    });
  } else {
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
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
