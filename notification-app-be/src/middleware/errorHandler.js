function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.response?.status || 500;
  const message = err.message || 'Internal server error';

  console.error(`[ERROR] ${req.method} ${req.originalUrl} - ${message}`);

  res.status(statusCode).json({
    success: false,
    error: { message }
  });
}

module.exports = { errorHandler };
