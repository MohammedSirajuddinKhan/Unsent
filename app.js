require("dotenv").config();

const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const methodOverride = require("method-override");
const passport = require("passport");
const connectMongo = require("connect-mongo");
const mongoose = require("mongoose");

const configurePassport = require("./server/config/passport");
const routes = require("./server/routes/index.js");
const cookieSession = require("cookie-session");
const path = require("path");

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

let databasePromise;

async function connectDatabase() {
  if (!databasePromise) {
    // Wrap the mongoose connect call with retry logic and sensible timeouts
    databasePromise = (async () => {
      const opts = {
        // Fail fast when the server is unreachable
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // Keep pool small for serverless environments
        maxPoolSize: 10,
        family: 4,
      };

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const conn = await mongoose.connect(mongoUri, opts);
          console.log("MongoDB connected succesfully");
          return conn;
        } catch (err) {
          console.error(
            `MongoDB connection attempt ${attempt} failed:`,
            err && err.message ? err.message : err,
          );
          // Clear the cached promise so future callers can retry
          databasePromise = null;

          if (attempt === maxAttempts) {
            // Exhausted retries — rethrow so callers can decide what to do
            throw err;
          }

          // Exponential backoff before retrying
          const delayMs = 1000 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    })();
  }

  return databasePromise;
}

function createSessionStore(storeOptions) {
  const createStore =
    connectMongo.create ||
    connectMongo.default?.create ||
    connectMongo.MongoStore?.create;

  if (typeof createStore === "function") {
    return createStore(storeOptions);
  }

  const StoreClass = connectMongo.MongoStore || connectMongo.default;

  if (typeof StoreClass === "function") {
    return new StoreClass(storeOptions);
  }

  throw new Error("Unable to initialize connect-mongo session store.");
}

async function createApp() {
  // Start connecting to the database in the background so cold starts
  // don't block on a full DB handshake in serverless environments.
  connectDatabase().catch((err) => {
    console.warn(
      "Background DB connect failed:",
      err && err.message ? err.message : err,
    );
  });

  const app = express();

  // Ensure views directory is absolute so serverless environments resolve templates
  app.set("views", path.join(__dirname, "views"));

  app.set("trust proxy", 1);

  // Prefer cookie-based sessions on Vercel to avoid session-store cold-starts.
  const useCookieSession =
    !!process.env.VERCEL || process.env.USE_COOKIE_SESSION === "1";

  const storeOptions = {
    // Use mongoUrl rather than a connected client so session store
    // initialization does not require an already-open mongoose connection.
    mongoUrl: mongoUri,
    collectionName: "sessions",
    touchAfter: 60 * 60 * 24,
  };

  let sessionMiddleware;

  if (useCookieSession) {
    sessionMiddleware = cookieSession({
      name: "session",
      keys: [process.env.SESSION_SECRET || "notes-app-session-secret"],
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    const sessionStore = createSessionStore(storeOptions);

    sessionMiddleware = session({
      secret: process.env.SESSION_SECRET || "notes-app-session-secret",
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    });
  }

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(methodOverride("_method"));
  app.use(express.static("public"));
  app.use(expressLayouts);

  app.set("layout", "layouts/main");
  app.set("view engine", "ejs");

  app.use(sessionMiddleware);

  app.use((req, res, next) => {
    const flashMessages = Array.isArray(req.session?.flashMessages)
      ? req.session.flashMessages
      : [];

    if (req.session) {
      req.session.flashMessages = [];
    }

    res.locals.flashMessages = flashMessages;
    res.flash = (type, message) => {
      const flashMessage = { type, message };

      if (!req.session) {
        res.locals.flashMessages = [...flashMessages, flashMessage];
        return;
      }

      if (!Array.isArray(req.session.flashMessages)) {
        req.session.flashMessages = [];
      }

      req.session.flashMessages.push(flashMessage);
    };

    next();
  });

  function isCurrentUserAdmin(user) {
    if (!user) {
      return false;
    }

    if (user.isAdmin) {
      return true;
    }

    const adminEmails = String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const userEmail = String(user.email || "").toLowerCase();

    return adminEmails.includes(userEmail);
  }

  configurePassport(passport);
  app.use(passport.initialize());
  app.use(passport.session());

// app.get("/",(req,res)=>{
//   res.send("Working fine here")
// })

  app.use((req, res, next) => {
    res.locals.currentUser = req.user || null;
    res.locals.isAdmin = isCurrentUserAdmin(req.user);
    next();
  });

  app.use("/", routes);

  app.use((req, res) => {
    res.status(404).send("Page not found");
  });

app.get("/",(req,res)=>{
  res.send("Vercel workin")
})

  return app;
}

async function startServer() {
  try {
    await connectDatabase();
  } catch (err) {
    console.warn(
      "Warning: failed to connect to MongoDB during startup; continuing without DB.",
      err && err.message ? err.message : err,
    );
  }

  const app = await createApp();

  app.get("/test", (req, res) => {
    res.send("App working");
  });

  app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
  });
}

if (require.main === module && !process.env.VERCEL) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

// Export the app factory as the module default (callable) to satisfy
// serverless platforms that expect the module to export a function or server.
module.exports = {
  createApp,
  connectDatabase,
  startServer,
};