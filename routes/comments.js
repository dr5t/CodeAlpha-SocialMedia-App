const express = require('express');
const { queryAll, queryOne, runSql } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();


router.post('/', requireAuth, (req, res) => {
  try {
    const { post_id, content } = req.body;

    if (!post_id || !content || !content.trim()) {
      return res.status(400).json({ error: 'Post ID and content are required' });
    }

    const post = queryOne('SELECT id FROM posts WHERE id = ?', [post_id]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const result = runSql(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [post_id, req.session.userId, content.trim()]
    );

    const comment = queryOne(
      `SELECT c.*, u.username, u.display_name, u.avatar, u.is_verified
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [result.lastInsertRowid]
    );

    const commentCount = queryOne('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [post_id]).count;

    res.status(201).json({ comment, comment_count: commentCount });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.delete('/:id', requireAuth, (req, res) => {
  try {
    const comment = queryOne('SELECT * FROM comments WHERE id = ? AND user_id = ?', [parseInt(req.params.id), req.session.userId]);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }

    runSql('DELETE FROM comments WHERE id = ?', [parseInt(req.params.id)]);

    const commentCount = queryOne('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [comment.post_id]).count;

    res.json({ message: 'Comment deleted', comment_count: commentCount });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
