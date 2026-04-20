const { app, ensureInitialized } = require("../index");

module.exports = async (req, res) => {
  try {
    await ensureInitialized();
    
    // Call Express app directly - it handles the HTTP request
    app(req, res);
  } catch (error) {
    console.error("Failed to initialize serverless app:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ message: "Server initialization failed", error: error.message }));
  }
};
