import dotenv from 'dotenv';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { seedDatabase } from './seed/seedData.js';
import { Employee } from './models/Employee.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

let server;

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed if database is currently empty
    const employeeCount = await Employee.countDocuments();
    if (employeeCount === 0) {
      console.log('[Server] Database is empty. Seeding initial assignment mockup data...');
      await seedDatabase();
    }

    server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Roots Media Management Backend running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`====================================================`);
    });

    server.on('error', async (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ [Server Error] Port ${PORT} is already in use by another process.`);
        console.error(`👉 Run 'lsof -i :${PORT}' and 'kill -9 <PID>' to free port ${PORT}, or change PORT in .env`);
      } else {
        console.error('\n❌ [Server Error] Unexpected server error:', err);
      }
      await disconnectDB();
      process.exit(1);
    });
  } catch (err) {
    console.error('[Server Error] Failed to start server:', err);
    await disconnectDB();
    process.exit(1);
  }
};

const handleShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('uncaughtException', async (err) => {
  console.error('[Process] Uncaught Exception:', err);
  await disconnectDB();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('[Process] Unhandled Rejection:', reason);
  await disconnectDB();
  process.exit(1);
});

if (!process.env.VERCEL) {
  startServer();
} else {
  connectDB().catch((err) => console.error('[Vercel Serverless] DB connection failed:', err));
}

export default app;
