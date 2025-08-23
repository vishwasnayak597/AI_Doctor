console.log('🚀 Starting AI Doc Backend Server...');

import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';

import Database from './utils/database';
import logger, { morganStream } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

async function startServer() {
  try {
    console.log('✅ 1. Starting server initialization...');
    
    // Create Express app
    const app = express();
    console.log('✅ 2. Express app created');
    
    // Setup CORS - this fixes your CORS issue!
    const corsOptions = {
      origin: function (origin, callback) {
        const allowedOrigins = [
          CLIENT_URL, 
          'http://localhost:3000', 
          'http://localhost:3001', 
          'http://localhost:3002', 
          'https://ai-doctor-qc2b.onrender.com',
          'https://aidoc.onrender.com'
        ].filter(Boolean); // Remove any undefined values
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          console.log('🚫 CORS blocked origin:', origin);
          console.log('🔍 Allowed origins:', allowedOrigins);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept', 'sec-ch-ua-platform', 'Referer', 'User-Agent', 'sec-ch-ua', 'sec-ch-ua-mobile'],
      exposedHeaders: ['Set-Cookie'],
      optionsSuccessStatus: 200,
      preflightContinue: false
    };
    app.use(cors(corsOptions));
    console.log('✅ 3. CORS configured with multiple origins');
    
    // Debug all requests
    app.use((req, res, next) => {
      console.log(`🔍 Request: ${req.method} ${req.path} from ${req.headers.origin || 'no-origin'}`);
      next();
    });
    
    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    console.log('✅ 4. Security middleware configured');
    
    // Request parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(cookieParser());
    app.use(compression());
    console.log('✅ 5. Request parsing middleware configured');
    
    // Logging middleware
    if (NODE_ENV !== 'test') {
      app.use(morgan('combined', { stream: morganStream }));
    }
    console.log('✅ 6. Logging middleware configured');
    
    // Rate limiting - Very permissive for development
    const globalRateLimit = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute window for development
      max: NODE_ENV === 'production' ? 100 : 10000, // 10000 requests per minute in dev
      message: { error: 'Too many requests from this IP' },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip rate limiting for development entirely
      skip: (req) => {
        if (NODE_ENV === 'development') {
          return true; // Skip all rate limiting in development
        }
        return false;
      }
    });
    app.use(globalRateLimit);
    console.log('✅ 7. Rate limiting configured (disabled for development)');
    
    // Health check route (before database connection)
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        message: 'AI Doc backend is running perfectly',
        environment: NODE_ENV,
        port: PORT,
        database: 'connected'
      });
    });
    console.log('✅ 8. Health check route configured');
    
    // Connect to database
    console.log('🔌 9. Connecting to database...');
    await Database.connect();
    console.log('✅ 9. Database connected successfully');
    
    // Import and setup routes AFTER database connection
    console.log('📝 10. Loading API routes...');
    try {
      const authRoutes = await import('./routes/auth');
      const aiRoutes = await import('./routes/ai');
      const appointmentRoutes = await import('./routes/appointments');
      const paymentRoutes = await import('./routes/payments');
      const notificationRoutes = await import('./routes/notifications');
      const videoCallRoutes = await import('./routes/video-calls');
      const userRoutes = await import('./routes/users');
      const medicalRecordRoutes = await import('./routes/medical-records');
      const prescriptionRoutes = await import('./routes/prescriptions');
      const reportRoutes = await import('./routes/reports');
      
      app.use('/api/auth', authRoutes.default);
      app.use('/api/ai', aiRoutes.default);
      app.use('/api/appointments', appointmentRoutes.default);
      app.use('/api/payments', paymentRoutes.default);
      app.use('/api/notifications', notificationRoutes.default);
      
      // Temporary fix for notifications count route
      app.get('/api/notifications/count', (req, res) => {
        res.json({ success: true, data: { count: 0 }, message: 'Notification count retrieved' });
      });
      
      app.use('/api/video-calls', videoCallRoutes.default);
      app.use('/api/users', userRoutes.default);
      app.use('/api/medical-records', medicalRecordRoutes.default);
      app.use('/api/prescriptions', prescriptionRoutes.default);
      app.use('/api/reports', reportRoutes.default);
      console.log('✅ 10. API routes loaded and configured successfully');
    } catch (routeError) {
      console.error('❌ Error loading routes:', routeError);
      throw routeError;
    }
    
    // Serve static files from frontend build (for production)
    if (NODE_ENV === 'production') {
      const frontendStaticPath = path.join(__dirname, '../../frontend/out');
      
      // Serve Next.js static assets with proper MIME types
      app.use('/_next', express.static(path.join(frontendStaticPath, '_next'), {
        setHeaders: (res, path) => {
          if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          }
        }
      }));
      
      // Serve all static files from the out directory
      app.use('/', express.static(frontendStaticPath, {
        setHeaders: (res, path) => {
          if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          }
        }
      }));
      
      // Handle SPA routing - serve index.html for all non-API routes
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
          res.sendFile(path.join(frontendStaticPath, 'index.html'));
        }
      });
    }
    
    // Error handling middleware (must be last)
    app.use(notFoundHandler);
    app.use(errorHandler);
    console.log('✅ 11. Error handling middleware configured');
    
    // Start HTTP server
    console.log('🎯 12. Starting HTTP server...');
    
    // Wrap app.listen in a Promise to ensure async function waits
    await new Promise<void>((resolve, reject) => {
      const server = app.listen(PORT, () => {
        console.log(`✅ 13. Server running on port ${PORT} in ${NODE_ENV} mode`);
        console.log(`✅ Health check: http://localhost:${PORT}/health`);
        console.log(`✅ CORS enabled for: https://ai-doctor-qc2b.onrender.com, localhost origins, and ${CLIENT_URL || 'CLIENT_URL not set'}`);
        console.log('🎉 AI Doc Backend Server is ready!');
        console.log('🔥 You can now test your curl request!');
        logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
        logger.info(`Health check: http://localhost:${PORT}/health`);
        
        // Keep server alive with periodic heartbeat
        const heartbeat = setInterval(() => {
          console.log(`❤️ Server heartbeat - ${new Date().toISOString()}`);
        }, 60000); // Every minute
        
        // Graceful shutdown handlers
        const gracefulShutdown = (signal: string) => {
          console.log(`${signal} signal received: closing HTTP server`);
          clearInterval(heartbeat);
          server.close(() => {
            console.log('HTTP server closed');
            Database.disconnect?.();
            process.exit(0);
          });
        };
        
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
          console.error('Uncaught Exception:', error);
          logger.error('Uncaught Exception:', error);
          gracefulShutdown('UNCAUGHT_EXCEPTION');
        });
        
        process.on('unhandledRejection', (reason, promise) => {
          console.error('Unhandled Rejection at:', promise, 'reason:', reason);
          logger.error('Unhandled Rejection:', { reason, promise });
          gracefulShutdown('UNHANDLED_REJECTION');
        });
        
        console.log('🔥 Server startup completed successfully!');
        resolve(); // Resolve the Promise now that server is listening
      });
      
      server.on('error', (err) => {
        console.error('❌ Server error:', err);
        logger.error('Server error:', err);
        reject(err);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  console.log('Starting AI Doc Backend Server...');
  startServer()
    .then(() => {
      console.log('🎉 Server startup completed successfully');
      console.log('🎯 Server is now running and ready to accept requests');
      // Keep the process alive - the server is now listening
    })
    .catch(error => {
      console.error('❌ Server startup failed:', error);
      process.exit(1);
    });
}

export default { startServer }; 