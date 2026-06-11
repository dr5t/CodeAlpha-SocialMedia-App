// ============================================
// Vibe Social — Feed Page Logic
// ============================================

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

  // --- Load stories (from followed users) ---
  function renderStories() {
    // Use suggestions as "stories" placeholder
    api('/api/users/suggestions')
      .then(data => {
        const users = data.users || [];
        // Add current user first as "Your story"
        const allStories = [
          { username: currentUser.username, display_name: 'Your story', avatar: currentUser.avatar },
          ...users,
        ];

        storiesBar.innerHTML = allStories.map(u => `
          <a href="/profile/${u.username}" class="story-item" style="text-decoration:none;color:inherit;">
            <div class="story-ring">
              <img src="${u.avatar}" alt="${u.username}">
            </div>
            <span class="story-name">${u.username === currentUser.username ? 'Your story' : u.username}</span>
          </a>
        `).join('');
      })
      .catch(() => {
        storiesBar.style.display = 'none';
      });
  }

  // --- Render sidebar ---
  function renderSidebar() {
    const sidebarProfile = document.getElementById('sidebar-profile');
    const sidebarSuggestions = document.getElementById('sidebar-suggestions');

    if (sidebarProfile) {
      sidebarProfile.innerHTML = `
        <a href="/profile/${currentUser.username}">
          <img src="${currentUser.avatar}" alt="${currentUser.username}" class="sidebar-profile__avatar">
        </a>
        <div class="sidebar-profile__info">
          <a href="/profile/${currentUser.username}" class="sidebar-profile__username" style="text-decoration:none;color:inherit;">${currentUser.username}</a>
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
                <a href="/profile/${u.username}" class="suggestion-item__username">${u.username}</a>
                <div class="suggestion-item__detail">${u.display_name}</div>
              </div>
              <button class="suggestion-follow-btn" data-user-id="${u.id}" onclick="handleSuggestionFollow(this, ${u.id})">Follow</button>
            </div>
          `).join('');
        })
        .catch(() => {});
    }
  }

  // --- Render a single post card ---
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
          <a href="/profile/${post.username}" class="post-card__username">${post.username}</a>
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
            <strong><a href="/profile/${post.username}" style="text-decoration:none;color:inherit;">${post.username}</a></strong> ${escapeHtml(post.caption)}
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

    // Enable/disable post button based on input
    const input = card.querySelector(`#comment-input-${post.id}`);
    const btn = card.querySelector(`#comment-btn-${post.id}`);
    input.addEventListener('input', () => {
      btn.classList.toggle('active', input.value.trim().length > 0);
    });

    return card;
  }

  // --- Load feed posts ---
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

  // --- Infinite scroll ---
  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      loadFeed();
    }
  });

  // --- Init ---
  renderStories();
  renderSidebar();

  // Show skeleton then load
  feedPosts.innerHTML = createPostSkeleton() + createPostSkeleton() + createPostSkeleton();
  setTimeout(async () => {
    feedPosts.innerHTML = '';
    await loadFeed();
  }, 600);
})();

// --- Global functions for inline handlers ---

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

  // Only like (don't unlike) on double-tap
  if (!btn.classList.contains('liked')) {
    toggleLike(postId);
  }

  // Animate heart overlay
  heart.classList.remove('animate');
  void heart.offsetWidth; // force reflow
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
