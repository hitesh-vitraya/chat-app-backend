const User = require('../models/User');
const { generateToken } = require('../services/authService');
const AppError = require('../utils/AppError');

const sendAuthResponse = (res, statusCode, message, user) => {
  const token = generateToken(user);

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      token,
      user: user.toJSON()
    }
  });
};

const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    const user = await User.create({ name, email, password });

    sendAuthResponse(res, 201, 'Signup successful', user);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }

    sendAuthResponse(res, 200, 'Login successful', user);
  } catch (error) {
    next(error);
  }
};

const getMe = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authenticated user fetched successfully',
    data: {
      user: req.user
    }
  });
};

module.exports = {
  signup,
  login,
  getMe
};
