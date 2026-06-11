const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/posts — create a new post (multer middleware applied in server.js)
router.post('/', requireAuth, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const caption = req.body.caption || '';
    const imagePath = '/uploads/' + req.file.filename;

    const result = runSql(
      'INSERT INTO posts (user_id, image_path, caption) VALUES (?, ?, ?)',
      [req.session.userId, imagePath, caption]
    );

    const post = queryOne(
      `SELECT p.*, u.username, u.display_name, u.avatar,
        0 as like_count, 0 as comment_count, 0 as is_liked
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [result.lastInsertRowid]
    );

    res.status(201).json({ post });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/feed — posts from followed users + self
router.get('/feed', requireAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const posts = queryAll(
      `SELECT p.*, u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id IN (
         SELECT following_id FROM followers WHERE follower_id = ?
       ) OR p.user_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.session.userId, req.session.userId, req.session.userId, limit, offset]
    );

    const hasMore = posts.length === limit;
    res.json({ posts, hasMore, page });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/explore — all posts
router.get('/explore', requireAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;

    const posts = queryAll(
      `SELECT p.*, u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.session.userId, limit, offset]
    );

    const hasMore = posts.length === limit;
    res.json({ posts, hasMore, page });
  } catch (err) {
    console.error('Explore error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/:id — single post with comments
router.get('/:id', requireAuth, (req, res) => {
  try {
    const post = queryOne(
      `SELECT p.*, u.username, u.display_name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [req.session.userId, parseInt(req.params.id)]
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comments = queryAll(
      `SELECT c.*, u.username, u.display_name, u.avatar
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [parseInt(req.params.id)]
    );

    res.json({ post, comments });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const post = queryOne('SELECT * FROM posts WHERE id = ? AND user_id = ?', [parseInt(req.params.id), req.session.userId]);

    if (!post) {
      return res.status(404).json({ error: 'Post not found or not authorized' });
    }

    runSql('DELETE FROM posts WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:id/like — toggle like
router.post('/:id/like', requireAuth, (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    const existing = queryOne('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.session.userId]);

    if (existing) {
      runSql('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.session.userId]);
    } else {
      runSql('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, req.session.userId]);
    }

    const likeCount = queryOne('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]).count;
    const isLiked = !existing;

    res.json({ is_liked: isLiked, like_count: likeCount });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
