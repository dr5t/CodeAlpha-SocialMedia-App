const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DATA_DIR, 'social.db');

const usePostgres = !!process.env.DATABASE_URL;
let pool = null;
let sqliteDb = null;

if (usePostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

function translateSql(sql) {
  if (!usePostgres) return sql;
  let count = 1;
  return sql.replace(/\?/g, () => `$${count++}`);
}

function cleanSqlForDb(sql) {
  if (usePostgres) {
    return sql
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
      .replace(/DATETIME/gi, 'TIMESTAMP');
  }
  return sql;
}

async function getDb() {
  if (usePostgres) {
    // Connect to PG pool and initialize
    await initTables();
    await seedDemoData();
    return pool;
  }

  if (sqliteDb) return sqliteDb;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqliteDb = new SQL.Database(buffer);
  } else {
    sqliteDb = new SQL.Database();
  }

  sqliteDb.run('PRAGMA foreign_keys = ON');
  await initTables();
  await seedDemoData();
  saveDb();

  return sqliteDb;
}

function saveDb() {
  if (usePostgres) return;
  const data = sqliteDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function executeRaw(sql) {
  const cleaned = cleanSqlForDb(sql);
  if (usePostgres) {
    const finalSql = translateSql(cleaned);
    await pool.query(finalSql);
  } else {
    sqliteDb.run(cleaned);
  }
}

async function initTables() {
  await executeRaw(`
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

  await executeRaw(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      caption TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await executeRaw(`
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

  await executeRaw(`
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

  await executeRaw(`
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
    await executeRaw(idx);
  }
}

async function queryAll(sql, params = []) {
  if (usePostgres) {
    const finalSql = translateSql(sql);
    const res = await pool.query(finalSql, params);
    return res.rows;
  } else {
    const stmt = sqliteDb.prepare(sql);
    if (params.length) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}

async function queryOne(sql, params = []) {
  const results = await queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

async function runSql(sql, params = []) {
  if (usePostgres) {
    let finalSql = sql;
    if (sql.trim().toUpperCase().startsWith('INSERT ')) {
      finalSql += ' RETURNING id';
    }
    finalSql = translateSql(finalSql);
    const res = await pool.query(finalSql, params);
    return {
      lastInsertRowid: res.rows[0]?.id || null,
      changes: res.rowCount,
    };
  } else {
    sqliteDb.run(sql, params);
    const lastRowIdQuery = await queryOne('SELECT last_insert_rowid() as id');
    const lastInsertRowid = lastRowIdQuery ? lastRowIdQuery.id : null;
    const changesQuery = await queryOne('SELECT changes() as c');
    const changes = changesQuery ? changesQuery.c : 0;
    saveDb();
    return {
      lastInsertRowid,
      changes,
    };
  }
}

async function seedDemoData() {
  const row = await queryOne('SELECT COUNT(*) as count FROM users');
  if (row && parseInt(row.count) > 0) return;

  const hash = bcrypt.hashSync('password123', 10);

  const demoUsers = [
    ['priya_designs', 'priya@example.com', hash, 'Priya Sharma', '✨ UI/UX Designer | Creating beautiful modern interfaces', '/images/avatar_priya.png', 'https://priyadesigns.com', 'she/her', 'Female', 1],
    ['dr5t', 'dr5t@example.com', hash, 'Shaurya Tiwari', '✨ Creator of Vibe Social | Developer', '/images/avatar_dr5t.png', 'https://github.com/dr5t', 'he/him', 'Male', 1]
  ];

  for (const u of demoUsers) {
    await runSql('INSERT INTO users (username, email, password_hash, display_name, bio, avatar, links, pronouns, gender, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', u);
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
    await runSql('INSERT INTO posts (user_id, image_path, caption, created_at) VALUES (?, ?, ?, ?)', p);
  }

  const comments = [
    [1, 2, 'Wow, the colors on this dashboard are stunning! Great work Priya.'],
    [4, 1, 'The lighting here is just magical! You have such a great eye Shaurya.']
  ];

  for (const c of comments) {
    await runSql('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', c);
  }

  const likes = [
    [1, 2], [2, 2], [3, 2], 
    [4, 1], [5, 1], [6, 1]  
  ];

  for (const l of likes) {
    await runSql('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', l);
  }

  const follows = [
    [1, 2],
    [2, 1]
  ];

  for (const f of follows) {
    await runSql('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', f);
  }

  saveDb();
}

module.exports = { getDb, queryAll, queryOne, runSql, saveDb };
