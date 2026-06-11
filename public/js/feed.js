



(async function() {
  const authenticated = await checkAuth();
  if (!authenticated) return;
  initApp();

  const feedPosts = document.getElementById('feed-posts');
  const feedLoader = document.getElementById('feed-loader');
  const feedEmpty = document.getElementById('feed-empty');
  const storiesBar = document.getElementById('stories-bar');

  let page = 1;
  let loading = false;
  let hasMore = true;

  
  function renderStories() {
    api('/api/users/suggestions')
      .then(data => {
        const users = data.users || [];
        const allStories = [
          { username: currentUser.username, display_name: 'Your story', avatar: currentUser.avatar },
          ...users,
        ];

        storiesBar.innerHTML = allStories.map((u, idx) => `
          <div class="story-item" onclick="openStory('${u.username}', '${u.avatar}', 'story-ring-${idx}')">
            <div class="story-ring" id="story-ring-${idx}">
              <img src="${u.avatar}" alt="${u.username}">
            </div>
            <span class="story-name">${u.username === currentUser.username ? 'Your story' : u.username}</span>
          </div>
        `).join('');
      })
      .catch(() => {
        storiesBar.style.display = 'none';
      });
  }

  
  function renderSidebar() {
    const sidebarProfile = document.getElementById('sidebar-profile');
    const sidebarSuggestions = document.getElementById('sidebar-suggestions');

    if (sidebarProfile) {
      sidebarProfile.innerHTML = `
        <a href="/profile/${currentUser.username}">
          <img src="${currentUser.avatar}" alt="${currentUser.username}" class="sidebar-profile__avatar">
        </a>
        <div class="sidebar-profile__info">
          <a href="/profile/${currentUser.username}" class="sidebar-profile__username" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;">
            ${currentUser.username}
            ${currentUser.is_verified ? `<span class="verified-badge-inline" style="margin-left:4px;" title="Verified"><svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.48 0-.938.09-1.36.25C14.775 2.48 13.51 1.5 12 1.5s-2.775.98-3.412 2.25c-.422-.16-.88-.25-1.36-.25C5.12 3.5 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.818 3.998.48 0 .938-.09 1.36-.25.637 1.27 1.902 2.25 3.412 2.25s2.775-.98 3.412-2.25c.422.16.88.25 1.36.25 2.11 0 3.82-1.79 3.82-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.8 3.8l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z"/></svg></span>` : ''}
          </a>
          <div class="sidebar-profile__name">${currentUser.display_name}</div>
        </div>
      `;
    }

    if (sidebarSuggestions) {
      api('/api/users/suggestions')
        .then(data => {
          sidebarSuggestions.innerHTML = (data.users || []).map(u => `
            <div class="suggestion-item">
              <a href="/profile/${u.username}">
                <img src="${u.avatar}" alt="${u.username}" class="suggestion-item__avatar">
              </a>
              <div class="suggestion-item__info">
                <a href="/profile/${u.username}" class="suggestion-item__username" style="display:inline-flex;align-items:center;">
                  ${u.username}
                  ${u.is_verified ? `<span class="verified-badge-inline" style="margin-left:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="#22c55e"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.48 0-.938.09-1.36.25C14.775 2.48 13.51 1.5 12 1.5s-2.775.98-3.412 2.25c-.422-.16-.88-.25-1.36-.25C5.12 3.5 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.818 3.998.48 0 .938-.09 1.36-.25.637 1.27 1.902 2.25 3.412 2.25s2.775-.98 3.412-2.25c.422.16.88.25 1.36.25 2.11 0 3.82-1.79 3.82-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.8 3.8l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z"/></svg></span>` : ''}
                </a>
                <div class="suggestion-item__detail">${u.display_name}</div>
              </div>
              <button class="suggestion-follow-btn" data-user-id="${u.id}" onclick="handleSuggestionFollow(this, ${u.id})">Follow</button>
            </div>
          `).join('');
        })
        .catch(() => {});
    }
  }

  
  function createPostCard(post) {
    const isLiked = post.is_liked > 0;
    const card = document.createElement('div');
    card.className = 'post-card fade-in';
    card.dataset.postId = post.id;

    card.innerHTML = `
      <div class="post-card__header">
        <a href="/profile/${post.username}">
          <img src="${post.avatar}" alt="${post.username}" class="post-card__avatar">
        </a>
        <div class="post-card__user-info">
          <a href="/profile/${post.username}" class="post-card__username" style="display:inline-flex;align-items:center;">
            ${post.username}
            ${post.is_verified ? `<span class="verified-badge-inline" style="margin-left:4px;" title="Verified"><svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.48 0-.938.09-1.36.25C14.775 2.48 13.51 1.5 12 1.5s-2.775.98-3.412 2.25c-.422-.16-.88-.25-1.36-.25C5.12 3.5 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.818 3.998.48 0 .938-.09 1.36-.25.637 1.27 1.902 2.25 3.412 2.25s2.775-.98 3.412-2.25c.422.16.88.25 1.36.25 2.11 0 3.82-1.79 3.82-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.8 3.8l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z"/></svg></span>` : ''}
          </a>
          <div class="post-card__time">${timeAgo(post.created_at)}</div>
        </div>
        ${post.user_id === currentUser.id ? `
          <button class="post-card__more" title="Delete post" onclick="deletePost(${post.id}, this)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        ` : ''}
      </div>
      <div class="post-card__image-wrapper" ondblclick="doubleTapLike(${post.id}, this)">
        <img src="${post.image_path}" alt="Post by ${post.username}" class="post-card__image" loading="lazy">
        <span class="heart-overlay" id="heart-${post.id}">❤️</span>
      </div>
      <div class="post-card__actions">
        <button class="post-card__action-btn ${isLiked ? 'liked' : ''}" id="like-btn-${post.id}" onclick="toggleLike(${post.id})">
          ${isLiked ? heartFilledSVG : heartOutlineSVG}
        </button>
        <a href="/post/${post.id}" class="post-card__action-btn" style="color:inherit;">
          ${commentSVG}
        </a>
        <button class="post-card__action-btn">
          ${shareSVG}
        </button>
        <button class="post-card__action-btn post-card__save">
          ${bookmarkSVG}
        </button>
      </div>
      <div class="post-card__body">
        <div class="post-card__likes" id="likes-count-${post.id}">${formatNumber(post.like_count)} ${post.like_count === 1 ? 'like' : 'likes'}</div>
        ${post.caption ? `
          <div class="post-card__caption">
            <strong><a href="/profile/${post.username}" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;">${post.username}${post.is_verified ? `<span class="verified-badge-inline" style="margin-left:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.48 0-.938.09-1.36.25C14.775 2.48 13.51 1.5 12 1.5s-2.775.98-3.412 2.25c-.422-.16-.88-.25-1.36-.25C5.12 3.5 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.998 3.818 3.998.48 0 .938-.09 1.36-.25.637 1.27 1.902 2.25 3.412 2.25s2.775-.98 3.412-2.25c.422.16.88.25 1.36.25 2.11 0 3.82-1.79 3.82-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.8 3.8l-3.3-3.3 1.4-1.4 1.9 1.9 5.3-5.3 1.4 1.4-6.7 6.7z"/></svg></span>` : ''}</a></strong> ${escapeHtml(post.caption)}
          </div>
        ` : ''}
        ${post.comment_count > 0 ? `
          <a href="/post/${post.id}" class="post-card__view-comments">View all ${post.comment_count} comments</a>
        ` : ''}
        <div class="post-card__timestamp">${fullDate(post.created_at)}</div>
      </div>
      <div class="post-card__comment-input">
        <button class="emoji-btn">😊</button>
        <input type="text" placeholder="Add a comment..." id="comment-input-${post.id}" onkeypress="if(event.key==='Enter')postComment(${post.id})">
        <button class="post-comment-btn" id="comment-btn-${post.id}" onclick="postComment(${post.id})">Post</button>
      </div>
    `;

    
    const input = card.querySelector(`#comment-input-${post.id}`);
    const btn = card.querySelector(`#comment-btn-${post.id}`);
    input.addEventListener('input', () => {
      btn.classList.toggle('active', input.value.trim().length > 0);
    });

    return card;
  }

  
  async function loadFeed() {
    if (loading || !hasMore) return;
    loading = true;
    feedLoader.style.display = 'flex';

    try {
      const data = await api(`/api/posts/feed?page=${page}`);
      const posts = data.posts || [];

      if (page === 1 && posts.length === 0) {
        feedEmpty.style.display = 'block';
        feedLoader.style.display = 'none';
        loading = false;
        return;
      }

      posts.forEach(post => {
        feedPosts.appendChild(createPostCard(post));
      });

      hasMore = data.hasMore;
      page++;
    } catch (err) {
      console.error('Feed error:', err);
    }

    feedLoader.style.display = 'none';
    loading = false;
  }

  
  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      loadFeed();
    }
  });

  
  renderStories();
  renderSidebar();

  
  feedPosts.innerHTML = createPostSkeleton() + createPostSkeleton() + createPostSkeleton();
  setTimeout(async () => {
    feedPosts.innerHTML = '';
    await loadFeed();
  }, 600);
})();



function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function toggleLike(postId) {
  try {
    const data = await api(`/api/posts/${postId}/like`, { method: 'POST' });
    const btn = document.getElementById(`like-btn-${postId}`);
    const likesEl = document.getElementById(`likes-count-${postId}`);

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

function doubleTapLike(postId, wrapper) {
  const heart = document.getElementById(`heart-${postId}`);
  const btn = document.getElementById(`like-btn-${postId}`);

  
  if (!btn.classList.contains('liked')) {
    toggleLike(postId);
  }

  
  heart.classList.remove('animate');
  void heart.offsetWidth; 
  heart.classList.add('animate');
}

async function postComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();
  if (!content) return;

  try {
    await api('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ post_id: postId, content }),
    });

    input.value = '';
    const btn = document.getElementById(`comment-btn-${postId}`);
    if (btn) btn.classList.remove('active');

    showToast('Comment added');
  } catch (err) {
    showToast('Failed to add comment');
  }
}

async function deletePost(postId, btnEl) {
  if (!confirm('Delete this post?')) return;

  try {
    await api(`/api/posts/${postId}`, { method: 'DELETE' });
    const card = btnEl.closest('.post-card');
    card.style.transition = 'opacity 0.3s, transform 0.3s';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';
    setTimeout(() => card.remove(), 300);
    showToast('Post deleted');
  } catch (err) {
    showToast('Failed to delete post');
  }
}

async function handleSuggestionFollow(btn, userId) {
  try {
    await api(`/api/users/${userId}/follow`, { method: 'POST' });
    btn.textContent = 'Following';
    btn.style.color = 'var(--text-secondary)';
    btn.disabled = true;
    showToast('Following!');
  } catch (err) {
    showToast('Already following');
  }
}


let storyTimeout;
let storyAnimation;

function openStory(username, avatar, ringId) {
  const viewer = document.getElementById('story-viewer');
  const fill = document.getElementById('story-progress-fill');
  
  document.getElementById('story-avatar').src = avatar;
  document.getElementById('story-username').textContent = username;
  document.getElementById('story-image').src = avatar; 
  
  viewer.classList.add('active');
  
  
  fill.style.transition = 'none';
  fill.style.width = '0%';
  
  
  setTimeout(() => {
    fill.style.transition = 'width 5s linear';
    fill.style.width = '100%';
  }, 50);
  
  
  clearTimeout(storyTimeout);
  storyTimeout = setTimeout(() => {
    closeStory(ringId);
  }, 5000);
}

function closeStory(ringId) {
  const viewer = document.getElementById('story-viewer');
  viewer.classList.remove('active');
  clearTimeout(storyTimeout);
  
  
  if (ringId) {
    const ring = document.getElementById(ringId);
    if (ring) ring.classList.add('viewed');
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('story-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeStory());
  }
});
