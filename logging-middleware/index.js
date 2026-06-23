function createLoggingMiddleware(options = {}) {
  const logger = options.logger || console;

  return function loggingMiddleware(req, res, next) {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const logLine = {
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        requestId: req.id,
      };

      if (res.statusCode >= 500) {
        logger.error(logLine);
      } else if (res.statusCode >= 400) {
        logger.warn(logLine);
      } else {
        logger.info(logLine);
      }
    });

    next();
  };
}

module.exports = createLoggingMiddleware;
