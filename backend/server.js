require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const contentRoutes = require('./routes/content');
const submissionRoutes = require('./routes/submissions');
const enrollmentRoutes = require('./routes/enrollments');
const uploadRoutes = require('./routes/uploads');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/uploads', uploadRoutes);
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    index: false,
    maxAge: '1d',
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
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Dot Jordan server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
