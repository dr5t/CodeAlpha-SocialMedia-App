// ============================================
// Vibe Social — Profile Page Logic
// ============================================

(async function() {
  const authenticated = await checkAuth();
  if (!authenticated) return;
  initApp();

  // Get username from URL
  const pathParts = window.location.pathname.split('/');
  const username = pathParts[pathParts.length - 1];

  if (!username) {
    window.location.href = '/feed';
    return;
  }

  const profileAvatar = document.getElementById('profile-avatar');
  const profileUsername = document.getElementById('profile-username');
  const profileActions = document.getElementById('profile-actions');
  const statPosts = document.getElementById('stat-posts');
  const statFollowers = document.getElementById('stat-followers');
  const statFollowing = document.getElementById('stat-following');
  const profileDisplayName = document.getElementById('profile-display-name');
  const profileBioText = document.getElementById('profile-bio-text');
  const profileGrid = document.getElementById('profile-grid');
  const profileEmpty = document.getElementById('profile-empty');
  const profileLoader = document.getElementById('profile-loader');

  let profileData = null;

  // --- Load profile ---
  async function loadProfile() {
    try {
      const data = await api(`/api/users/${username}`);
      profileData = data.user;

      document.title = `${profileData.display_name} (@${profileData.username}) — Vibe Social`;

      profileAvatar.src = profileData.avatar;
      profileUsername.textContent = profileData.username;
      statPosts.textContent = profileData.post_count;
      statFollowers.textContent = formatNumber(profileData.follower_count);
      statFollowing.textContent = formatNumber(profileData.following_count);
      profileDisplayName.textContent = profileData.display_name;
      profileBioText.textContent = profileData.bio || '';

      // Action buttons
      if (profileData.is_own_profile) {
        profileActions.innerHTML = `
          <button class="btn btn-secondary" id="edit-profile-btn">Edit profile</button>
        `;
        document.getElementById('edit-profile-btn').addEventListener('click', openEditModal);
      } else {
        const followClass = profileData.is_following ? 'btn-follow following' : 'btn-follow';
        const followText = profileData.is_following ? 'Following' : 'Follow';
        profileActions.innerHTML = `
          <button class="${followClass}" id="follow-btn">${followText}</button>
          <button class="btn btn-secondary" onclick="window.location.href='/feed'">Message</button>
        `;
        document.getElementById('follow-btn').addEventListener('click', handleFollow);
      }

      // Load posts
      loadPosts();
    } catch (err) {
      console.error('Profile error:', err);
      document.querySelector('.page-content').innerHTML = `
        <div class="empty-state" style="padding-top:100px;">
          <span class="empty-state__icon">😢</span>
          <h2 class="empty-state__title">User not found</h2>
          <p class="empty-state__text">The account you're looking for doesn't exist.</p>
          <a href="/feed" class="btn btn-primary">Go Home</a>
        </div>
      `;
    }
  }

  // --- Load posts grid ---
  async function loadPosts() {
    try {
      const data = await api(`/api/users/${profileData.id}/posts`);
      const posts = data.posts || [];

      if (posts.length === 0) {
        profileEmpty.style.display = 'block';
        return;
      }

      profileGrid.innerHTML = posts.map(post => `
        <a href="/post/${post.id}" class="profile-grid__item">
          <img src="${post.image_path}" alt="Post" loading="lazy">
          <div class="profile-grid__overlay">
            <div class="profile-grid__stat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              ${post.like_count}
            </div>
            <div class="profile-grid__stat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${post.comment_count}
            </div>
          </div>
        </a>
      `).join('');
    } catch (err) {
      console.error('Load posts error:', err);
    }
  }

  // --- Follow/Unfollow ---
  async function handleFollow() {
    const btn = document.getElementById('follow-btn');
    const isFollowing = btn.classList.contains('following');

    try {
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const data = await api(`/api/users/${profileData.id}/${endpoint}`, { method: 'POST' });

      if (isFollowing) {
        btn.classList.remove('following');
        btn.textContent = 'Follow';
      } else {
        btn.classList.add('following');
        btn.textContent = 'Following';
      }

      statFollowers.textContent = formatNumber(data.follower_count);
      profileData.is_following = !isFollowing;
      profileData.follower_count = data.follower_count;

      showToast(isFollowing ? 'Unfollowed' : 'Following!');
    } catch (err) {
      showToast('Error updating follow status');
    }
  }

  // --- Edit profile modal ---
  function openEditModal() {
    const modal = document.getElementById('edit-modal');
    const nameInput = document.getElementById('edit-display-name');
    const bioInput = document.getElementById('edit-bio');

    nameInput.value = profileData.display_name || '';
    bioInput.value = profileData.bio || '';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  document.getElementById('edit-modal-close').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.remove('active');
    document.body.style.overflow = '';
  });

  document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') {
      document.getElementById('edit-modal').classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const nameInput = document.getElementById('edit-display-name');
    const bioInput = document.getElementById('edit-bio');

    try {
      const data = await api('/api/users/update', {
        method: 'PUT',
        body: JSON.stringify({
          display_name: nameInput.value,
          bio: bioInput.value,
        }),
      });

      profileDisplayName.textContent = data.user.display_name;
      profileBioText.textContent = data.user.bio;
      profileData.display_name = data.user.display_name;
      profileData.bio = data.user.bio;

      document.getElementById('edit-modal').classList.remove('active');
      document.body.style.overflow = '';
      showToast('Profile updated!');
    } catch (err) {
      showToast('Failed to update profile');
    }
  });

  // --- Followers/Following modals ---
  const followListModal = document.getElementById('follow-list-modal');
  const followListTitle = document.getElementById('follow-list-title');
  const followList = document.getElementById('follow-list');

  document.getElementById('stat-followers-btn').addEventListener('click', () => {
    loadFollowList('followers');
  });

  document.getElementById('stat-following-btn').addEventListener('click', () => {
    loadFollowList('following');
  });

  document.getElementById('follow-list-close').addEventListener('click', () => {
    followListModal.classList.remove('active');
    document.body.style.overflow = '';
  });

  followListModal.addEventListener('click', (e) => {
    if (e.target === followListModal) {
      followListModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  async function loadFollowList(type) {
    followListTitle.textContent = type === 'followers' ? 'Followers' : 'Following';
    followList.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    followListModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
      const data = await api(`/api/users/${profileData.id}/${type}`);
      const users = data.users || [];

      if (users.length === 0) {
        followList.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">No users yet</div>';
        return;
      }

      followList.innerHTML = users.map(u => `
        <div class="follow-list-item">
          <a href="/profile/${u.username}">
            <img src="${u.avatar}" alt="${u.username}">
          </a>
          <div class="follow-list-item__info">
            <a href="/profile/${u.username}" class="follow-list-item__username" style="text-decoration:none;color:inherit;">${u.username}</a>
            <div class="follow-list-item__name">${u.display_name}</div>
          </div>
          ${u.id !== currentUser.id ? `
            <button class="btn-follow ${u.is_following ? 'following' : ''}" onclick="handleListFollow(this, ${u.id}, ${u.is_following})" style="padding:5px 16px;font-size:13px;">
              ${u.is_following ? 'Following' : 'Follow'}
            </button>
          ` : ''}
        </div>
      `).join('');
    } catch (err) {
      followList.innerHTML = '<div style="padding:40px;text-align:center;color:var(--error);">Failed to load</div>';
    }
  }

  // --- Init ---
  await loadProfile();
})();

// Global handler for follow list items
async function handleListFollow(btn, userId, wasFollowing) {
  try {
    const endpoint = wasFollowing ? 'unfollow' : 'follow';
    await api(`/api/users/${userId}/${endpoint}`, { method: 'POST' });

    if (wasFollowing) {
      btn.classList.remove('following');
      btn.textContent = 'Follow';
      btn.onclick = () => handleListFollow(btn, userId, false);
    } else {
      btn.classList.add('following');
      btn.textContent = 'Following';
      btn.onclick = () => handleListFollow(btn, userId, true);
    }
  } catch (err) {
    console.error('Follow error:', err);
  }
}
