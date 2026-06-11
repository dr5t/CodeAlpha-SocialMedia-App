const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype) || file.mimetype === 'image/svg+xml';
    if (ext || mime) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'vibe-social-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Avatar upload route
app.post('/api/users/avatar', upload.single('avatar'), (req, res, next) => {
  req.url = '/avatar';
  userRoutes(req, res, next);
});

// Post creation uses multer middleware
app.post('/api/posts', upload.single('image'), (req, res, next) => {
  // Delegate to postRoutes after multer processes the file
  req.url = '/';
  postRoutes(req, res, next);
});

// Other post routes
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// SPA fallback — serve appropriate HTML pages
app.get('/feed', (req, res) => res.sendFile(path.join(__dirname, 'public', 'feed.html')));
app.get('/explore', (req, res) => res.sendFile(path.join(__dirname, 'public', 'explore.html')));
app.get('/profile/:username', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/post/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'post.html')));

// Start server
async function start() {
  try {
    await getDb();
    console.log('📦 Database initialized');

    app.listen(PORT, () => {
      console.log(`\n🚀 Vibe Social is running!`);
      console.log(`   Local: http://localhost:${PORT}`);
      console.log(`\n   Demo accounts (password: password123):`);
      console.log(`   • priya_designs`);
      console.log(`   • arjun_photography\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
