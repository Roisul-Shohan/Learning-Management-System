// Serverless function entry — export the Express `app`.
// Let `app.js` handle lazy initialization (including DB connect) on first request.
const app = require('../app');

module.exports = app;
