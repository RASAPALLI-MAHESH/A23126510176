const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const notificationRoutes = require('./routes/notificationRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const createLoggingMiddleware = require('../../logging-middleware');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // integrate logging middleware from stage 1
  app.use(createLoggingMiddleware({ logger: console }));

  app.use('/api/v1', notificationRoutes);

  app.use((req, res, next) => {
    const err = new Error('Not found');
    err.status = 404;
    next(err);
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
