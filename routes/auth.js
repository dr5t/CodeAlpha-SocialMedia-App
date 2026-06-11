const express = require('express');
const bcrypt = require('bcryptjs');
const { queryAll, queryOne, runSql } = require('../database');

const router = express.Router();


router.post('/register', (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }

    if (!/^[a-zA-Z0-9._]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, dots, and underscores' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username.toLowerCase(), email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = runSql(
      'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
      [username.toLowerCase(), email.toLowerCase(), passwordHash, displayName || username]
    );

    req.session.userId = result.lastInsertRowid;

    const user = queryOne('SELECT id, username, display_name, bio, avatar FROM users WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json({ user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = queryOne('SELECT * FROM users WHERE username = ? OR email = ?', [username.toLowerCase(), username.toLowerCase()]);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.id;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        avatar: user.avatar,
        links: user.links,
        pronouns: user.pronouns,
        gender: user.gender,
        is_verified: user.is_verified,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ message: 'Logged out' });
  });
});


router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = queryOne('SELECT id, username, display_name, bio, avatar, email, links, pronouns, gender, is_verified FROM users WHERE id = ?', [req.session.userId]);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

module.exports = router;
