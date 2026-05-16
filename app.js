require("dotenv").config();
const express = require("express");

async function createApp() {
  const app = express();

  app.get("/", (req, res) => {
    res.send("Vercel finally works");
  });

  return app;
}

module.exports = { createApp };
