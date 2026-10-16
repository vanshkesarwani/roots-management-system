import mongoose from 'mongoose';

let mongoMemoryServer = null;

export const connectDB = async () => {
  // If already connected (e.g. serverless warm container), reuse connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      console.log(`[Database] Connecting to configured MongoDB URI: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err) {
      console.warn(`[Database] Could not connect to configured MONGODB_URI: ${err.message}`);
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        throw err;
      }
      console.log('[Database] Falling back to automated in-memory MongoDB server for local development...');
    }
  }

  // Fallback to in-memory MongoDB server (development & test only)
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create();
    const memUri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`[Database] In-Memory MongoDB Started & Connected: ${memUri}`);
    return conn;
  } catch (err) {
    console.error(`[Database] Failed to start In-Memory MongoDB: ${err.message}`);
    throw err;
  }
};

export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
    console.log('[Database] MongoDB disconnected cleanly');
  } catch (err) {
    console.error(`[Database] Error during disconnect: ${err.message}`);
  }
};
