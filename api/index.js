const serverless = require("serverless-http");
const { createApp } = require("../app");

let cachedHandler;

module.exports = async (req, res) => {
  try {
    if (!cachedHandler) {
      const app = await createApp();
      cachedHandler = serverless(app);
    }

    return cachedHandler(req, res);
  } catch (error) {
    console.error("Serverless startup error:", error);
    res.statusCode = 500;
    res.end(`Error: ${error.message}`);
  }
};
