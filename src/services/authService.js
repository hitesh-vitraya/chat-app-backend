const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const generateToken = (user) => {
  if (!env.jwtSecret) {
    throw new AppError('JWT secret is not configured', 500);
  }

  return jwt.sign(
    { id: user._id.toString(), email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

module.exports = {
  generateToken
};
