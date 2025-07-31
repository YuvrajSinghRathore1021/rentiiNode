require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 2100,
  JWT_SECRET: process.env.JWT_SECRET || 'yuvi',
  // Other constants
};