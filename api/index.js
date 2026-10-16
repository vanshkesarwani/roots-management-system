import app from '../backend/app.js';
import { connectDB } from '../backend/config/db.js';
import { Employee } from '../backend/models/Employee.js';

let isInitialized = false;

async function initDB() {
  if (isInitialized) return;

  await connectDB();

  // If connected to a new/empty database, seed initial dataset
  try {
    const employeeCount = await Employee.countDocuments();
    if (employeeCount === 0) {
      console.log('[Vercel Serverless] Database is empty. Seeding initial assignment mockup data...');
      const { seedDatabase } = await import('../backend/seed/seedData.js');
      await seedDatabase();
    }
  } catch (err) {
    console.warn('[Vercel Serverless] Auto-seed check warning:', err.message);
  }

  isInitialized = true;
}

export default async function handler(req, res) {
  try {
    await initDB();
  } catch (err) {
    console.error('[Vercel Serverless] DB connection failed:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to connect to database. Please verify MONGODB_URI in Vercel environment variables.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  // Ensure path starts with /api for backend/app.js route matching
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url}`;
  }

  return app(req, res);
}
