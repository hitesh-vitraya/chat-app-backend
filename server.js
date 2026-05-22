const http = require('http');
const app = require('./app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const { initializeSocket } = require('./src/sockets');

const server = http.createServer(app);

initializeSocket(server);

const startServer = async () => {
  try {
    await connectDB();

    server.listen(env.port, () => {
      console.log(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

const shutdown = (signal) => {
  console.log(`${signal} received. Closing server...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
