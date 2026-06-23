require('dotenv').config();
const { createApp } = require('./app');

async function startServer() {
  const PORT = process.env.PORT || 3001;
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[INFO] Vehicle scheduler service started on port ${PORT}`);
    console.log(`[INFO] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
  
  // catch unhandled rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[ERROR] Unhandled Rejection: ${err.message}`);
  });
}

startServer();
