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
      links TEXT,
      pronouns TEXT,
      gender TEXT,
      is_verified INTEGER DEFAULT 0,
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


function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}


function runSql(sql, params = []) {
  db.run(sql, params);
  const lastInsertRowid = queryOne('SELECT last_insert_rowid() as id').id;
  const changes = queryOne('SELECT changes() as c').c;
  saveDb();
  return {
    lastInsertRowid,
    changes,
  };
}

function seedDemoData() {
  const row = queryOne('SELECT COUNT(*) as count FROM users');
  if (row.count > 0) return;

  const hash = bcrypt.hashSync('password123', 10);

  const demoUsers = [
    ['priya_designs', 'priya@example.com', hash, 'Priya Sharma', '✨ UI/UX Designer | Creating beautiful modern interfaces', '/images/avatar_priya.png', 'https://priyadesigns.com', 'she/her', 'Female', 1],
    ['dr5t', 'dr5t@example.com', hash, 'Shaurya Tiwari', '✨ Creator of Vibe Social | Developer', '/images/avatar_dr5t.png', 'https://github.com/dr5t', 'he/him', 'Male', 1]
  ];

  for (const u of demoUsers) {
    db.run('INSERT INTO users (username, email, password_hash, display_name, bio, avatar, links, pronouns, gender, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', u);
  }

  const demoPosts = [
    [1, '/images/posts/post1.svg', 'Just finished the new dashboard design concept! What do you guys think? 🎨 #design #uiux', '2026-06-11 08:30:00'],
    [1, '/images/posts/post10.svg', 'Experimenting with some new color palettes today. Love these vibrant tones. 🌈', '2026-06-11 07:15:00'],
    [1, '/images/posts/post11.svg', 'Minimalism is key. Less is always more. ✨', '2026-06-10 22:00:00'],
    [2, '/images/posts/post2.svg', 'Golden hour never disappoints. Caught this beautiful light yesterday evening. 🌇 #photography', '2026-06-10 18:45:00'],
    [2, '/images/posts/post7.svg', 'Street photography vibes in the city center. 🏙️', '2026-06-10 14:30:00'],
    [2, '/images/posts/post12.svg', 'Moody rainy days are my favorite to shoot in. 🌧️', '2026-06-10 10:00:00']
  ];

  for (const p of demoPosts) {
    db.run('INSERT INTO posts (user_id, image_path, caption, created_at) VALUES (?, ?, ?, ?)', p);
  }

  const comments = [
    [1, 2, 'Wow, the colors on this dashboard are stunning! Great work Priya.'],
    [4, 1, 'The lighting here is just magical! You have such a great eye Shaurya.']
  ];

  for (const c of comments) {
    db.run('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', c);
  }

  const likes = [
    [1, 2], [2, 2], [3, 2], 
    [4, 1], [5, 1], [6, 1]  
  ];

  for (const l of likes) {
    db.run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', l);
  }

  const follows = [
    [1, 2],
    [2, 1]
  ];

  for (const f of follows) {
    db.run('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', f);
  }

  saveDb();
}

module.exports = { getDb, queryAll, queryOne, runSql, saveDb };
