const express = require('express');
const bcrypt = require('bcryptjs');
const { queryAll, queryOne, runSql } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();


router.get('/search', requireAuth, (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.json({ users: [] });
    }

    const users = queryAll(
      `SELECT id, username, display_name, avatar, bio, is_verified
       FROM users
       WHERE (username LIKE ? OR display_name LIKE ?)
       AND id != ?
       LIMIT 20`,
      [`%${q}%`, `%${q}%`, req.session.userId]
    );

    res.json({ users });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/suggestions', requireAuth, (req, res) => {
  try {
    const users = queryAll(
      `SELECT id, username, display_name, avatar, bio, is_verified
       FROM users
       WHERE id != ?
       AND id NOT IN (SELECT following_id FROM followers WHERE follower_id = ?)
       ORDER BY RANDOM()
       LIMIT 5`,
      [req.session.userId, req.session.userId]
    );

    res.json({ users });
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/:username', requireAuth, (req, res) => {
  try {
    const user = queryOne(
      'SELECT id, username, display_name, bio, avatar, links, pronouns, gender, is_verified, created_at FROM users WHERE username = ?',
      [req.params.username.toLowerCase()]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const postCount = queryOne('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [user.id]).count;
    const followerCount = queryOne('SELECT COUNT(*) as count FROM followers WHERE following_id = ?', [user.id]).count;
    const followingCount = queryOne('SELECT COUNT(*) as count FROM followers WHERE follower_id = ?', [user.id]).count;
    const isFollowing = queryOne('SELECT id FROM followers WHERE follower_id = ? AND following_id = ?', [req.session.userId, user.id]);

    res.json({
      user: {
        ...user,
        post_count: postCount,
        follower_count: followerCount,
        following_count: followingCount,
        is_following: !!isFollowing,
        is_own_profile: user.id === req.session.userId,
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/:id/posts', requireAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;

    const posts = queryAll(
      `SELECT p.*,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
       FROM posts p
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(req.params.id), limit, offset]
    );

    res.json({ posts });
  } catch (err) {
    console.error('Get user posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/:id/follow', requireAuth, (req, res) => {
  try {
    const targetId = parseInt(req.params.id);

    if (targetId === req.session.userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const target = queryOne('SELECT id FROM users WHERE id = ?', [targetId]);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = queryOne('SELECT id FROM followers WHERE follower_id = ? AND following_id = ?', [req.session.userId, targetId]);
    if (existing) {
      return res.status(409).json({ error: 'Already following' });
    }

    runSql('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', [req.session.userId, targetId]);

    const followerCount = queryOne('SELECT COUNT(*) as count FROM followers WHERE following_id = ?', [targetId]).count;
    res.json({ message: 'Followed', follower_count: followerCount });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/:id/unfollow', requireAuth, (req, res) => {
  try {
    const targetId = parseInt(req.params.id);

    runSql('DELETE FROM followers WHERE follower_id = ? AND following_id = ?', [req.session.userId, targetId]);

    const followerCount = queryOne('SELECT COUNT(*) as count FROM followers WHERE following_id = ?', [targetId]).count;
    res.json({ message: 'Unfollowed', follower_count: followerCount });
  } catch (err) {
    console.error('Unfollow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.put('/update', requireAuth, (req, res) => {
  try {
    const { username, display_name, bio, links, pronouns, gender, password } = req.body;

    const currentUser = queryOne('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let targetUsername = currentUser.username;
    const isUsernameChanged = username && username.trim().toLowerCase() !== currentUser.username;

    if (isUsernameChanged) {
      if (!password) {
        return res.status(400).json({ error: 'Password is required to change username' });
      }
      if (!bcrypt.compareSync(password, currentUser.password_hash)) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
      
      const newUsername = username.trim().toLowerCase();
      if (newUsername.length < 3 || newUsername.length > 30) {
        return res.status(400).json({ error: 'Username must be 3-30 characters' });
      }
      if (!/^[a-zA-Z0-9._]+$/.test(newUsername)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, dots, and underscores' });
      }

      const existing = queryOne('SELECT id FROM users WHERE username = ?', [newUsername]);
      if (existing) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      targetUsername = newUsername;
    }

    runSql(
      `UPDATE users
       SET username = ?, display_name = ?, bio = ?, links = ?, pronouns = ?, gender = ?
       WHERE id = ?`,
      [
        targetUsername,
        display_name !== undefined ? display_name : currentUser.display_name,
        bio !== undefined ? bio : currentUser.bio,
        links !== undefined ? links : currentUser.links,
        pronouns !== undefined ? pronouns : currentUser.pronouns,
        gender !== undefined ? gender : currentUser.gender,
        req.session.userId
      ]
    );

    const user = queryOne('SELECT id, username, display_name, bio, avatar, links, pronouns, gender, is_verified FROM users WHERE id = ?', [req.session.userId]);
    res.json({ user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/avatar', requireAuth, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    runSql('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, req.session.userId]);
    const user = queryOne('SELECT id, username, display_name, bio, avatar, links, pronouns, gender, is_verified FROM users WHERE id = ?', [req.session.userId]);
    res.json({ message: 'Avatar updated successfully', user });
  } catch (err) {
    console.error('Avatar update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.delete('/avatar', requireAuth, (req, res) => {
  try {
    runSql('UPDATE users SET avatar = "/images/default-avatar.svg" WHERE id = ?', [req.session.userId]);
    const user = queryOne('SELECT id, username, display_name, bio, avatar, links, pronouns, gender, is_verified FROM users WHERE id = ?', [req.session.userId]);
    res.json({ message: 'Avatar reset to default', user });
  } catch (err) {
    console.error('Delete avatar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/verify/purchase', requireAuth, (req, res) => {
  try {
    runSql('UPDATE users SET is_verified = 1 WHERE id = ?', [req.session.userId]);
    const user = queryOne('SELECT id, username, display_name, bio, avatar, links, pronouns, gender, is_verified FROM users WHERE id = ?', [req.session.userId]);
    res.json({ message: 'Verification successful', user });
  } catch (err) {
    console.error('Verify purchase error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/:id/followers', requireAuth, (req, res) => {
  try {
    const followers = queryAll(
      `SELECT u.id, u.username, u.display_name, u.avatar, u.is_verified,
        CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as is_following
       FROM followers f
       JOIN users u ON u.id = f.follower_id
       LEFT JOIN followers f2 ON f2.follower_id = ? AND f2.following_id = u.id
       WHERE f.following_id = ?`,
      [req.session.userId, parseInt(req.params.id)]
    );

    res.json({ users: followers });
  } catch (err) {
    console.error('Get followers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/:id/following', requireAuth, (req, res) => {
  try {
    const following = queryAll(
      `SELECT u.id, u.username, u.display_name, u.avatar, u.is_verified,
        CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as is_following
       FROM followers f
       JOIN users u ON u.id = f.following_id
       LEFT JOIN followers f2 ON f2.follower_id = ? AND f2.following_id = u.id
       WHERE f.follower_id = ?`,
      [req.session.userId, parseInt(req.params.id)]
    );

    res.json({ users: following });
  } catch (err) {
    console.error('Get following error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
