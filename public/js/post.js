



(async function() {
  const authenticated = await checkAuth();
  if (!authenticated) return;
  initApp();

  
  const pathParts = window.location.pathname.split('/');
  const postId = parseInt(pathParts[pathParts.length - 1]);

  if (!postId) {
    window.location.href = '/feed';
    return;
  }

  const postImage = document.getElementById('post-image');
  const postHeader = document.getElementById('post-header');
  const postComments = document.getElementById('post-comments');
  const postActions = document.getElementById('post-actions');
  const postLikes = document.getElementById('post-likes');
  const postTime = document.getElementById('post-time');
  const commentInput = document.getElementById('comment-input');
  const postCommentBtn = document.getElementById('post-comment-btn');

  let postData = null;
  let isLiked = false;

  
  async function loadPost() {
    try {
      const data = await api(`/api/posts/${postId}`);
      postData = data.post;
      isLiked = postData.is_liked > 0;
      const comments = data.comments || [];

      document.title = `${postData.username}'s post — Vibe Social`;

      
      postImage.src = postData.image_path;
      postImage.alt = `Post by ${postData.username}`;

      
      postHeader.innerHTML = `
        <a href="/profile/${postData.username}">
          <img src="${postData.avatar}" alt="${postData.username}">
        </a>
        <a href="/profile/${postData.username}" class="post-detail__header-username" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;">
          ${postData.username}
          ${postData.is_verified ? `<span class="verified-badge-inline" style="margin-left:4px;" title="Verified"><svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.48 0-.938.09-1.36.25C14.775 2.48 13.51 1.5 12 1.5s-2.775.98-3.412 2.25c-.422-.16-.88-.25-1.36-.25C5.12 3.5 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.818 3.998.48 0 .938-.09 1.36-.25.637 1.27 1.902 2.25 3.412 2.25s2.775-.98 3.412-2.25c.422.16.88.25 1.36.25 2.11 0 3.82-1.79 3.82-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.8 3.8l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z"/></svg></span>` : ''}
        </a>
        ${postData.user_id === currentUser.id ? `
          <button class="post-card__more" onclick="handleDeletePost()" title="Delete">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        ` : ''}
      `;

      
      let commentsHtml = '';

      if (postData.caption) {
        commentsHtml += `
          <div class="comment-item">
            <a href="/profile/${postData.username}">
              <img src="${postData.avatar}" alt="${postData.username}">
            </a>
            <div class="comment-item__body">
              <div class="comment-item__text">
                <strong><a href="/profile/${postData.username}" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;">${postData.username}${postData.is_verified ? `<span class="verified-badge-inline" style="margin-left:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.48 0-.938.09-1.36.25C14.775 2.48 13.51 1.5 12 1.5s-2.775.98-3.412 2.25c-.422-.16-.88-.25-1.36-.25C5.12 3.5 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.818 3.998.48 0 .938-.09 1.36-.25.637 1.27 1.902 2.25 3.412 2.25s2.775-.98 3.412-2.25c.422.16.88.25 1.36.25 2.11 0 3.82-1.79 3.82-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.8 3.8l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z"/></svg></span>` : ''}</a></strong> ${escapeHtml(postData.caption)}
              </div>
              <div class="comment-item__time">${timeAgo(postData.created_at)}</div>
            </div>
          </div>
        `;
      }

      comments.forEach(c => {
        commentsHtml += `
          <div class="comment-item" id="comment-${c.id}">
            <a href="/profile/${c.username}">
              <img src="${c.avatar}" alt="${c.username}">
            </a>
            <div class="comment-item__body">
              <div class="comment-item__text">
                <strong><a href="/profile/${c.username}" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;">${c.username}${c.is_verified ? `<span class="verified-badge-inline" style="margin-left:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.48 0-.938.09-1.36.25C14.775 2.48 13.51 1.5 12 1.5s-2.775.98-3.412 2.25c-.422-.16-.88-.25-1.36-.25C5.12 3.5 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.818 3.998.48 0 .938-.09 1.36-.25.637 1.27 1.902 2.25 3.412 2.25s2.775-.98 3.412-2.25c.422.16.88.25 1.36.25 2.11 0 3.82-1.79 3.82-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.8 3.8l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z"/></svg></span>` : ''}</a></strong> ${escapeHtml(c.content)}
              </div>
              <div class="comment-item__time">
                ${timeAgo(c.created_at)}
                ${c.user_id === currentUser.id ? `<button style="background:none;color:var(--text-secondary);font-size:12px;margin-left:8px;cursor:pointer;" onclick="handleDeleteComment(${c.id})">Delete</button>` : ''}
              </div>
            </div>
          </div>
        `;
      });

      postComments.innerHTML = commentsHtml;

      
      postComments.scrollTop = postComments.scrollHeight;

      
      postActions.innerHTML = `
        <button class="post-card__action-btn ${isLiked ? 'liked' : ''}" id="detail-like-btn" onclick="handleToggleLike()">
          ${isLiked ? heartFilledSVG : heartOutlineSVG}
        </button>
        <button class="post-card__action-btn" onclick="document.getElementById('comment-input').focus()">
          ${commentSVG}
        </button>
        <button class="post-card__action-btn">
          ${shareSVG}
        </button>
        <button class="post-card__action-btn post-card__save">
          ${bookmarkSVG}
        </button>
      `;

      
      postLikes.textContent = `${formatNumber(postData.like_count)} ${postData.like_count === 1 ? 'like' : 'likes'}`;

      
      postTime.textContent = fullDate(postData.created_at);

    } catch (err) {
      console.error('Load post error:', err);
      document.getElementById('post-detail').innerHTML = `
        <div class="empty-state" style="padding-top:60px;">
          <span class="empty-state__icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg></span>
          <h2 class="empty-state__title">Post not found</h2>
          <p class="empty-state__text">This post may have been deleted.</p>
          <a href="/feed" class="btn btn-primary">Go Home</a>
        </div>
      `;
    }
  }

  
  commentInput.addEventListener('input', () => {
    postCommentBtn.classList.toggle('active', commentInput.value.trim().length > 0);
  });

  commentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handlePostComment();
  });

  postCommentBtn.addEventListener('click', handlePostComment);

  async function handlePostComment() {
    const content = commentInput.value.trim();
    if (!content) return;

    try {
      const data = await api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ post_id: postId, content }),
      });

      const c = data.comment;

      const commentHtml = `
        <div class="comment-item fade-in" id="comment-${c.id}">
          <a href="/profile/${c.username}">
            <img src="${c.avatar}" alt="${c.username}">
          </a>
          <div class="comment-item__body">
            <div class="comment-item__text">
              <strong><a href="/profile/${c.username}" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;">${c.username}${c.is_verified ? `<span class="verified-badge-inline" style="margin-left:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.48 0-.938.09-1.36.25C14.775 2.48 13.51 1.5 12 1.5s-2.775.98-3.412 2.25c-.422-.16-.88-.25-1.36-.25C5.12 3.5 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.818 3.998.48 0 .938-.09 1.36-.25.637 1.27 1.902 2.25 3.412 2.25s2.775-.98 3.412-2.25c.422.16.88.25 1.36.25 2.11 0 3.82-1.79 3.82-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.8 3.8l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z"/></svg></span>` : ''}</a></strong> ${escapeHtml(c.content)}
            </div>
            <div class="comment-item__time">
              just now
              <button style="background:none;color:var(--text-secondary);font-size:12px;margin-left:8px;cursor:pointer;" onclick="handleDeleteComment(${c.id})">Delete</button>
            </div>
          </div>
        </div>
      `;

      postComments.insertAdjacentHTML('beforeend', commentHtml);
      postComments.scrollTop = postComments.scrollHeight;

      commentInput.value = '';
      postCommentBtn.classList.remove('active');
    } catch (err) {
      showToast('Failed to add comment');
    }
  }

  
  await loadPost();
})();



function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function handleToggleLike() {
  const pathParts = window.location.pathname.split('/');
  const postId = parseInt(pathParts[pathParts.length - 1]);

  try {
    const data = await api(`/api/posts/${postId}/like`, { method: 'POST' });
    const btn = document.getElementById('detail-like-btn');
    const likesEl = document.getElementById('post-likes');

    if (data.is_liked) {
      btn.classList.add('liked');
      btn.innerHTML = heartFilledSVG;
    } else {
      btn.classList.remove('liked');
      btn.innerHTML = heartOutlineSVG;
    }

    likesEl.textContent = `${formatNumber(data.like_count)} ${data.like_count === 1 ? 'like' : 'likes'}`;
  } catch (err) {
    console.error('Like error:', err);
  }
}

async function handleDeleteComment(commentId) {
  try {
    await api(`/api/comments/${commentId}`, { method: 'DELETE' });
    const el = document.getElementById(`comment-${commentId}`);
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }
    showToast('Comment deleted');
  } catch (err) {
    showToast('Failed to delete comment');
  }
}

async function handleDeletePost() {
  if (!confirm('Delete this post?')) return;

  const pathParts = window.location.pathname.split('/');
  const postId = parseInt(pathParts[pathParts.length - 1]);

  try {
    await api(`/api/posts/${postId}`, { method: 'DELETE' });
    showToast('Post deleted');
    setTimeout(() => window.location.href = '/feed', 1000);
  } catch (err) {
    showToast('Failed to delete post');
  }
}
