const mongoose = require('mongoose');
const env = require('./env');

const maskMongoUri = (uri) => {
  if (!uri) {
    return 'not configured';
  }

  try {
    const parsedUri = new URL(uri);
    const databaseName = parsedUri.pathname && parsedUri.pathname !== '/' ? parsedUri.pathname : '/not-specified';

    if (parsedUri.password) {
      parsedUri.password = '****';
    }

    return `${parsedUri.protocol}//${parsedUri.username ? `${parsedUri.username}:****@` : ''}${parsedUri.host}${databaseName}`;
  } catch (_error) {
    return 'invalid MongoDB URI format';
  }
};

mongoose.connection.on('connected', () => {
  console.log('MongoDB connection event: connected');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection event: error', error.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection event: disconnected');
});

const connectDB = async () => {
  mongoose.set('strictQuery', true);

  console.log('MongoDB connection attempt started');
  console.log(`MongoDB URI: ${maskMongoUri(env.mongoUri)}`);
  console.log(`MongoDB readyState before connect: ${mongoose.connection.readyState}`);

  const connection = await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 8000
  });

  console.log(`MongoDB connected: ${connection.connection.host}`);
  console.log(`MongoDB database: ${connection.connection.name || 'not specified'}`);
  console.log(`MongoDB readyState after connect: ${connection.connection.readyState}`);

  return connection;
};

module.exports = connectDB;
