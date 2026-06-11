const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'social.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  initTables();
  seedDemoData();
  saveDb();

  return db;
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      bio TEXT DEFAULT '',
      avatar TEXT DEFAULT '/images/default-avatar.svg',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      caption TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS followers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(follower_id, following_id)
    )
  `);

  // indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)',
    'CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id)',
    'CREATE INDEX IF NOT EXISTS idx_likes_user_post ON likes(user_id, post_id)',
    'CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id)',
    'CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id)',
  ];
  for (const idx of indexes) {
    db.run(idx);
  }
}

// Helper to run a query and return all results as array of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper to run a query and return first result as object
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Helper to run an insert/update/delete
function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return {
    lastInsertRowid: queryOne('SELECT last_insert_rowid() as id').id,
    changes: queryOne('SELECT changes() as c').c,
  };
}

function seedDemoData() {
  const row = queryOne('SELECT COUNT(*) as count FROM users');
  if (row.count > 0) return;

  const hash = bcrypt.hashSync('password123', 10);

  const demoUsers = [
    ['sarah_design', 'sarah@demo.com', hash, 'Sarah Mitchell', '✨ UI/UX Designer | Coffee addict ☕ | Creating beautiful things daily', '/images/avatars/avatar1.svg'],
    ['alex.photos', 'alex@demo.com', hash, 'Alex Rivera', '📸 Photographer | Traveler 🌍 | Based in NYC', '/images/avatars/avatar2.svg'],
    ['maya_codes', 'maya@demo.com', hash, 'Maya Chen', '💻 Full-stack developer | Open source enthusiast | Cat mom 🐱', '/images/avatars/avatar3.svg'],
    ['james_fit', 'james@demo.com', hash, 'James Wilson', '🏋️ Fitness Coach | Nutrition tips | Transform your life 💪', '/images/avatars/avatar4.svg'],
    ['emma.art', 'emma@demo.com', hash, 'Emma Thompson', '🎨 Digital artist | Illustrator | Commissions open ✉️', '/images/avatars/avatar5.svg'],
  ];

  for (const u of demoUsers) {
    db.run('INSERT INTO users (username, email, password_hash, display_name, bio, avatar) VALUES (?, ?, ?, ?, ?, ?)', u);
  }

  const demoPosts = [
    [1, '/images/posts/post1.svg', 'Just wrapped up this new dashboard design ✨ What do you think? #design #ui', '2026-06-11 08:30:00'],
    [2, '/images/posts/post2.svg', 'Golden hour in Central Park 🌅 NYC never disappoints #photography #nyc', '2026-06-11 07:15:00'],
    [3, '/images/posts/post3.svg', 'Shipped a new feature today! Dark mode is finally here 🌙 #coding #developer', '2026-06-10 22:00:00'],
    [4, '/images/posts/post4.svg', 'Morning workout done ✅ Consistency is key! 💪 #fitness #motivation', '2026-06-10 18:45:00'],
    [5, '/images/posts/post5.svg', 'New illustration for a children\'s book project 🎨📚 #art #illustration', '2026-06-10 14:30:00'],
    [1, '/images/posts/post6.svg', 'Coffee + wireframes = perfect morning ☕✏️ #design #uxdesign', '2026-06-10 10:00:00'],
    [2, '/images/posts/post7.svg', 'Street photography vibes 🏙️ Love the contrast here #streetphoto', '2026-06-09 20:00:00'],
    [3, '/images/posts/post8.svg', 'Built a real-time chat app this weekend 🚀 Link in bio! #webdev', '2026-06-09 16:30:00'],
    [4, '/images/posts/post9.svg', 'Meal prep Sunday 🥗 Eating clean, feeling great #healthyfood', '2026-06-09 12:00:00'],
    [5, '/images/posts/post10.svg', 'Playing with color palettes for a new project 🌈 #digitalart', '2026-06-08 21:00:00'],
    [1, '/images/posts/post11.svg', 'Exploring minimalist design trends for 2026 🤍 #minimal #designtrends', '2026-06-08 15:00:00'],
    [2, '/images/posts/post12.svg', 'Rainy day reflections ☔ Sometimes the best shots come unexpectedly #rain', '2026-06-08 09:00:00'],
  ];

  for (const p of demoPosts) {
    db.run('INSERT INTO posts (user_id, image_path, caption, created_at) VALUES (?, ?, ?, ?)', p);
  }

  const comments = [
    [1, 2, 'This looks amazing! Love the color choices 🔥'],
    [1, 3, 'Clean design! What tool did you use?'],
    [1, 5, 'The typography is perfect 👌'],
    [2, 1, 'Stunning shot! 😍'],
    [2, 4, 'NYC sunsets hit different'],
    [3, 1, 'Finally! I\'ve been waiting for dark mode 🙌'],
    [3, 2, 'Great work Maya!'],
    [4, 3, 'You\'re so dedicated! 💪'],
    [5, 1, 'This is adorable! Love the style'],
    [5, 3, 'Beautiful work Emma ❤️'],
    [6, 2, 'Same! Coffee is essential for creativity ☕'],
    [7, 5, 'Love the shadows in this one'],
    [8, 4, 'That\'s impressive for a weekend project!'],
  ];

  for (const c of comments) {
    db.run('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', c);
  }

  const likes = [
    [1,2],[1,3],[1,4],[1,5],
    [2,1],[2,3],[2,5],
    [3,1],[3,2],[3,4],[3,5],
    [4,1],[4,2],[4,3],
    [5,1],[5,2],[5,3],[5,4],
    [6,2],[6,3],
    [7,1],[7,5],
    [8,1],[8,4],[8,5],
    [9,1],[9,3],
    [10,1],[10,2],[10,3],
    [11,2],[11,4],[11,5],
    [12,1],[12,3],
  ];

  for (const l of likes) {
    db.run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', l);
  }

  const follows = [
    [1,2],[1,3],[1,5],
    [2,1],[2,3],[2,4],
    [3,1],[3,2],[3,4],[3,5],
    [4,1],[4,2],[4,3],
    [5,1],[5,2],[5,3],[5,4],
  ];

  for (const f of follows) {
    db.run('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', f);
  }

  saveDb();
}

module.exports = { getDb, queryAll, queryOne, runSql, saveDb };
