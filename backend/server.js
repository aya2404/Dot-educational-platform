require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/db');
const { buildAllowedOrigins, isOriginAllowed } = require('./utils/cors');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const contentRoutes = require('./routes/content');
const submissionRoutes = require('./routes/submissions');
const enrollmentRoutes = require('./routes/enrollments');
const uploadRoutes = require('./routes/uploads');
const notificationRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');
const organizationRoutes = require('./routes/organizations');
const analyticsRoutes = require('./routes/analytics');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = buildAllowedOrigins(process.env.CLIENT_ORIGIN);

// Minimal, dependency-free security-header baseline (helmet is not a dependency).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins, isProduction)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    index: false,
    maxAge: '1d',
    setHeaders(res) {
      // Never render user uploads inline (defence-in-depth against stored HTML/SVG):
      // force download and prevent content-type sniffing.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'attachment');
    },
  })
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dot Jordan API is running' });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    await connectDB();

    app.listen(PORT, () => {
      console.log(`Dot Jordan server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Only auto-start when run directly (e.g. `node server.js`), so the app can be
// imported by tests without opening a port or exiting the process.
if (require.main === module) {
  startServer();
}

module.exports = app;
