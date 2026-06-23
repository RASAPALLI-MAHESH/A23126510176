const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const schedulerRoutes = require('./routes/schedulerRoutes');
const { errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // generate request id
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'vehicle-scheduler-be',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.use('/api/v1', schedulerRoutes);

  // catch 404
  app.use((req, res, next) => {
    const err = new Error(`Route not found: ${req.originalUrl}`);
    err.status = 404;
    next(err);
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
