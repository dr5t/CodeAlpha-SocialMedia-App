const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/search?q=...
router.get('/search', requireAuth, (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.json({ users: [] });
    }

    const users = queryAll(
      `SELECT id, username, display_name, avatar, bio
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

// GET /api/users/suggestions
router.get('/suggestions', requireAuth, (req, res) => {
  try {
    const users = queryAll(
      `SELECT id, username, display_name, avatar, bio
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

// GET /api/users/:username
router.get('/:username', requireAuth, (req, res) => {
  try {
    const user = queryOne(
      'SELECT id, username, display_name, bio, avatar, created_at FROM users WHERE username = ?',
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

// GET /api/users/:id/posts
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

// POST /api/users/:id/follow
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

// POST /api/users/:id/unfollow
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

// PUT /api/users/update
router.put('/update', requireAuth, (req, res) => {
  try {
    const { display_name, bio } = req.body;

    runSql('UPDATE users SET display_name = ?, bio = ? WHERE id = ?', [display_name || '', bio || '', req.session.userId]);

    const user = queryOne('SELECT id, username, display_name, bio, avatar FROM users WHERE id = ?', [req.session.userId]);
    res.json({ user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/followers
router.get('/:id/followers', requireAuth, (req, res) => {
  try {
    const followers = queryAll(
      `SELECT u.id, u.username, u.display_name, u.avatar,
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

// GET /api/users/:id/following
router.get('/:id/following', requireAuth, (req, res) => {
  try {
    const following = queryAll(
      `SELECT u.id, u.username, u.display_name, u.avatar,
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
