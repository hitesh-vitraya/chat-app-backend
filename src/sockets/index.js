const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { handleConnection } = require('./handlers/connectionHandler');

let io;

const getTokenFromSocket = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken;
  }

  const authHeader = socket.handshake.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = getTokenFromSocket(socket);

    if (!token) {
      return next(new Error('Authentication token is required'));
    }

    if (!env.jwtSecret) {
      return next(new Error('JWT secret is not configured'));
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error('User no longer exists'));
    }

    socket.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid authentication token'));
    }

    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication token has expired'));
    }

    return next(error);
  }
};

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
      credentials: true
    }
  });

  io.use(authenticateSocket);
  io.on('connection', handleConnection);

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }

  return io;
};

module.exports = {
  initializeSocket,
  getIO
};
