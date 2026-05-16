const serverless = require("serverless-http");
const { createApp } = require("../app");

let app;
let handler;

module.exports = async (req, res) => {
  try {
    if (!handler) {
      if (!app) {
        app = await createApp();
      }
      handler = serverless(app);
    }

    return handler(req, res);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end("Server Error: " + err.message);
  }
};
