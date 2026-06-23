// global error handler
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.response?.status || 500;
  const message = err.message || 'Internal server error';

  const isProd = process.env.NODE_ENV === 'production';
  console.error({
    level: 'ERROR',
    message: message,
    stack: !isProd ? err.stack : undefined,
    requestId: req.id,
    path: req.originalUrl,
    method: req.method
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message: message,
      details: err.details,
      requestId: req.id,
    },
  });
}

module.exports = { errorHandler };
