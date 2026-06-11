import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './config/logger.js';
import sequelize from './models/index.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/productRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import supplierRoutes from './routes/suppliers.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import importRoutes from './routes/imports.js';
import barcodeRoutes from './routes/barcodes.js';
import automationRoutes from './routes/automation.js';
import requestRoutes from './routes/requests.js';
import { initCronJobs } from './services/cronService.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { requestLogger, responseTime } from './middlewares/loggingMiddleware.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging Middleware
app.use(requestLogger);
app.use(responseTime);

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      
      const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
      if (allowedOrigins.includes(origin) || isLocalhost) {
        return callback(null, true);
      }
      
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests, please try again later',
});

app.use('/api/', limiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    message: 'Server is running', 
    timestamp: new Date(),
    database: 'checking...',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/barcodes', barcodeRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api', requestRoutes);

// 404 Handler
app.use(notFoundHandler);

// Error Handler Middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;

// Test database connection and start server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection successful');

    // Sync models with database (for development only)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synced');
    }

    // Initialize cron jobs after database connection is successful and synced
    initCronJobs();

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      console.log(`\nServer running at http://localhost:${PORT}`);
      console.log(` Health check at http://localhost:${PORT}/health`);
      console.log(` Auth endpoints at http://localhost:${PORT}/api/auth\n`);
    });
  } catch (error) {
    logger.error('Server startup failed:', error);
    console.error('Server startup error:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
