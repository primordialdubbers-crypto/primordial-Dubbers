import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import roleProtectedRoutes from './routes/roleProtectedRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import artistRoutes from './routes/artistRoutes.js';
import pointsRoutes from './routes/pointsRoutes.js';
import appealRoutes from './routes/appealRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import evaluationRoutes from './routes/evaluationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import directorTalentRoutes from './routes/directorTalentRoutes.js';
import { RANK_TIERS, AWARDS_CATALOG, DEDUCTIONS_CATALOG } from '@pdi/shared';


export function createApp() {
  const app = express();

  // Security middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false, // configure specifically when serving static in prod
    })
  );

  // CORS configuration
  const corsMiddleware = cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.includes('railway.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.startsWith('capacitor://') ||
        (config.corsOrigin && origin === config.corsOrigin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
  });

  app.use(corsMiddleware);
  app.options('*', corsMiddleware);

  // Rate limiting for auth routes (prevent brute force)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
      error: { code: 'RATE_LIMIT_EXCEEDED' },
    },
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser(config.cookieSecret));

  // Root status check (fallback if frontend dist not present)
  app.get('/api', (req, res) => {
    res.status(200).json({
      status: 'online',
      service: 'Primordial Dubbers India — API',
      version: '1.0.3',
      health: '/api/v1/health',
      ranks: '/api/v1/ranks',
      docs: 'https://github.com/primordialdubbers-crypto/primordial-Dubbers',
    });
  });

  // System Health and liveness endpoints for Railway / cloud runners
  app.get(['/healthz', '/ping'], (req, res) => {
    res.status(200).send('OK');
  });

  // Health check
  app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'pdi-voice-artist-ranking-api',
      version: '1.0.4',
    });
  });

  // Public system rank rules endpoint (accessible to visitors per PRD)
  app.get('/api/v1/ranks', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        ranks: RANK_TIERS,
        awards: AWARDS_CATALOG,
        deductions: DEDUCTIONS_CATALOG,
      },
    });
  });

  // Static file serving for dev/test uploaded media
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // API v1 routes
  app.use('/api/v1/auth', authLimiter, authRoutes);
  app.use('/api/v1/leaderboard', leaderboardRoutes);
  app.use('/api/v1', artistRoutes);
  app.use('/api/v1', pointsRoutes);
  app.use('/api/v1', appealRoutes);
  app.use('/api/v1', challengeRoutes);
  app.use('/api/v1', submissionRoutes);
  app.use('/api/v1', evaluationRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/director', directorTalentRoutes);
  app.use('/api/v1', roleProtectedRoutes);

  // Serve Frontend React SPA if dist folder exists
  const candidateDistPaths = [
    path.resolve(process.cwd(), '../web/dist'),
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(__dirname, '../../../apps/web/dist'),
  ];
  const webDistPath = candidateDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

  if (webDistPath) {
    app.use(
      express.static(webDistPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  }

  // Fallback 404 handler for unmatched API routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      error: { code: 'NOT_FOUND' },
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
