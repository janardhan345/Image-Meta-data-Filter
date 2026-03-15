import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import connectDB from './config/db.js';
import { validateEnv } from './config/validateEnv.js';
import { generalLimiter, authLimiter } from './middleware/ratelimiter.js';
import authRouter from './routes/auth.js';
import imagesRouter from './routes/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Validate env vars first
validateEnv();

// 2. Create app before anything else
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Connect to database
await connectDB();

// 4. Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(generalLimiter);

// 5. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 6. Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 7. Routes
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/images', imagesRouter);

// 8. 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// 9. Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : 'Internal server error',
    stack: isDev ? err.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});