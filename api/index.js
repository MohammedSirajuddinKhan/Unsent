const serverless = require("serverless-http");
const { createApp } = require("../app");

let handler;

module.exports = async (req, res) => {
  if (!handler) {
    const app = await createApp();
    handler = serverless(app);
  }

  return handler(req, res);
};
