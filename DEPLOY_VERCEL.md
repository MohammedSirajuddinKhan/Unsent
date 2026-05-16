Vercel Deployment Checklist

Quick goal: Deploy the Notes app to Vercel as a serverless function and avoid common startup failures.

1. Prepare environment variables (Vercel Dashboard → Settings → Environment Variables)

- MONGO_URI: Use an Atlas SRV connection string (recommended). Example: `mongodb+srv://<user>:<pass>@cluster0.mongodb.net/unsent?retryWrites=true&w=majority`
- SESSION_SECRET: strong secret used to sign session cookies.
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET: OAuth credentials from Google Cloud.
- GOOGLE_CALLBACK_URL: `https://<your-app>.vercel.app/auth/google/callback` (must match Google Cloud Console).
- NODE_ENV=production (optional but recommended)

2. MongoDB / Atlas

- Prefer Atlas with SRV connection; paste the full `MONGO_URI` into Vercel env.
- Ensure the DB user has read/write on the app database.
- In Atlas Network Access, allow connections from Vercel by adding 0.0.0.0/0 (or use a narrower list if you have a static IP allocation). Vercel is dynamic, so 0.0.0.0/0 is the simplest for testing.

3. Google OAuth

- In Google Cloud Console → Credentials → OAuth 2.0 Client IDs, set:
  - Authorized JavaScript origins: `https://<your-app>.vercel.app`
  - Authorized redirect URIs: `https://<your-app>.vercel.app/auth/google/callback`
- Use those values in Vercel env variables.

4. Session & runtime considerations

- The app uses `connect-mongo` with Mongoose client reuse; we attempt to reuse connections across invocations. Keep `MONGO_URI` fast and sensible.
- Vercel serverless functions have short cold-start tolerances; Atlas is recommended.
- Ensure `SESSION_SECRET` is set in all environments (Preview/Production) or login flows may fail.

5. Vercel config (already present)

- `vercel.json` rewrites all routes to the single serverless function `api/index`.
- `api/index.js` uses `serverless-http` and lazy-initializes the Express app.

6. Local testing before deploy

- Start local DB or use Atlas.
- Add env to local `.env` (do not commit it).
- Run locally: `npm run dev` (nodemon) or `node app.js` (start).
- Or use `vercel dev` (Vercel CLI) to emulate serverless behavior.

7. Deploy to Vercel

- Option A (Git): push to a GitHub/GitLab/Bitbucket repo connected to Vercel; Vercel will auto-deploy.
- Option B (CLI): run `vercel` in the project root and follow prompts.

8. Post-deploy checks

- Visit `https://<your-app>.vercel.app/` and test sign-in.
- If login redirects fail, check Google OAuth callback and Vercel env values.
- Check Vercel logs: `vercel logs <deployment>` or Vercel Dashboard → Deployments → Logs.

9. Common errors & fixes

- "Mongo connection timeout" -> Verify `MONGO_URI`, Atlas IP access list, and DB user credentials.
- "Session not persisting" -> Ensure `SESSION_SECRET` is set and `connect-mongo` can open a session collection (logs will show store errors).
- Cold-start timeouts -> Use Atlas and keep connections reused; consider upgrading Vercel plan if functions hit time limits.

10. Optional improvements

- Move `SESSION_SECRET` and credentials into Vercel Secrets.
- Use a separate read-replica or performance-tier Atlas cluster for production.
- Add health-check endpoint that does a quick DB ping for uptime monitoring.

If you want, I can: create a small `README.md` section from this checklist, add a health-check route, or walk through the Vercel dashboard setup step-by-step.
