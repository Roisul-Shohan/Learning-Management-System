console.log('API function starting...');

const { connectDB } = require('../config/db');

connectDB().then(() => {
  console.log('Database connected successfully');
  const app = require('../app');
  console.log('App loaded successfully');
  module.exports = app;
}).catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});
const app = require('../app');

module.exports = app;
