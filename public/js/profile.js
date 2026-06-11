



(async function() {
  const authenticated = await checkAuth();
  if (!authenticated) return;
  initApp();

  
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

  
  async function loadProfile() {
    try {
      const data = await api(`/api/users/${username}`);
      profileData = data.user;

      document.title = `${profileData.display_name} (@${profileData.username}) — Vibe Social`;

      profileAvatar.src = profileData.avatar;
      
      
      let usernameHTML = profileData.username;
      if (profileData.is_verified) {
        usernameHTML += `
          <span class="verified-badge-inline" title="Verified">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0095f6"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </span>
        `;
      }
      profileUsername.innerHTML = usernameHTML;

      statPosts.textContent = profileData.post_count;
      statFollowers.textContent = formatNumber(profileData.follower_count);
      statFollowing.textContent = formatNumber(profileData.following_count);
      
      
      let nameHTML = profileData.display_name;
      if (profileData.pronouns) {
        nameHTML += ` <span class="profile-pronouns">${profileData.pronouns}</span>`;
      }
      profileDisplayName.innerHTML = nameHTML;
      profileBioText.textContent = profileData.bio || '';

      
      if (profileData.links) {
        let linkEl = document.getElementById('profile-link');
        if (!linkEl) {
          linkEl = document.createElement('a');
          linkEl.id = 'profile-link';
          linkEl.className = 'profile-bio__link';
          linkEl.target = '_blank';
          profileBioText.parentNode.appendChild(linkEl);
        }
        linkEl.href = profileData.links.startsWith('http') ? profileData.links : 'https://' + profileData.links;
        linkEl.innerHTML = `
          <svg class="link-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span>${profileData.links.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>
        `;
        linkEl.style.display = 'flex';
      } else {
        const linkEl = document.getElementById('profile-link');
        if (linkEl) linkEl.style.display = 'none';
      }

      
      if (profileData.is_own_profile) {
        profileActions.innerHTML = `
          <button class="btn btn-secondary" id="edit-profile-btn">Edit profile</button>
          <button class="btn-settings-icon" id="settings-trigger-btn" title="Settings">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        `;
        document.getElementById('edit-profile-btn').addEventListener('click', openEditModal);
        document.getElementById('settings-trigger-btn').addEventListener('click', openSettingsModal);
      } else {
        const followClass = profileData.is_following ? 'btn-follow following' : 'btn-follow';
        const followText = profileData.is_following ? 'Following' : 'Follow';
        profileActions.innerHTML = `
          <button class="${followClass}" id="follow-btn">${followText}</button>
          <button class="btn btn-secondary" onclick="window.location.href='/feed'">Message</button>
        `;
        document.getElementById('follow-btn').addEventListener('click', handleFollow);
      }

      
      loadPosts();
    } catch (err) {
      console.error('Profile error:', err);
      document.querySelector('.page-content').innerHTML = `
        <div class="empty-state" style="padding-top:100px;">
          <span class="empty-state__icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg></span>
          <h2 class="empty-state__title">User not found</h2>
          <p class="empty-state__text">The account you're looking for doesn't exist.</p>
          <a href="/feed" class="btn btn-primary">Go Home</a>
        </div>
      `;
    }
  }

  
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

  
  function openEditModal() {
    const modal = document.getElementById('edit-modal');
    const nameInput = document.getElementById('edit-display-name');
    const usernameInput = document.getElementById('edit-username');
    const passwordInput = document.getElementById('edit-password');
    const pronounsInput = document.getElementById('edit-pronouns');
    const linksInput = document.getElementById('edit-links');
    const genderSelect = document.getElementById('edit-gender');
    const bioInput = document.getElementById('edit-bio');
    const avatarPreview = document.getElementById('edit-avatar-preview');

    nameInput.value = profileData.display_name || '';
    usernameInput.value = profileData.username || '';
    passwordInput.value = '';
    passwordInput.disabled = true;
    document.getElementById('password-field-hint').style.display = 'none';
    pronounsInput.value = profileData.pronouns || '';
    linksInput.value = profileData.links || '';
    genderSelect.value = profileData.gender || 'Prefer not to say';
    bioInput.value = profileData.bio || '';
    avatarPreview.src = profileData.avatar || '/images/default-avatar.svg';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    
    usernameInput.oninput = () => {
      const changed = usernameInput.value.trim().toLowerCase() !== profileData.username;
      passwordInput.disabled = !changed;
      document.getElementById('password-field-hint').style.display = changed ? 'block' : 'none';
    };
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
    const usernameInput = document.getElementById('edit-username');
    const passwordInput = document.getElementById('edit-password');
    const pronounsInput = document.getElementById('edit-pronouns');
    const linksInput = document.getElementById('edit-links');
    const genderSelect = document.getElementById('edit-gender');
    const bioInput = document.getElementById('edit-bio');

    const payload = {
      display_name: nameInput.value,
      bio: bioInput.value,
      username: usernameInput.value.trim(),
      pronouns: pronounsInput.value,
      links: linksInput.value,
      gender: genderSelect.value
    };

    const isUsernameChanged = usernameInput.value.trim().toLowerCase() !== profileData.username;
    if (isUsernameChanged) {
      if (!passwordInput.value) {
        showToast('Password required to change username');
        return;
      }
      payload.password = passwordInput.value;
    }

    try {
      const data = await api('/api/users/update', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      showToast('Profile updated!');
      document.getElementById('edit-modal').classList.remove('active');
      document.body.style.overflow = '';

      if (isUsernameChanged) {
        window.location.href = `/profile/${data.user.username}`;
      } else {
        profileData = { ...profileData, ...data.user };
        loadProfile();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile');
    }
  });

  
  const triggerAvatarUpload = document.getElementById('trigger-avatar-upload');
  const removeAvatarBtn = document.getElementById('remove-avatar-btn');
  const avatarFileInput = document.getElementById('avatar-file-input');
  const editAvatarPreview = document.getElementById('edit-avatar-preview');

  if (triggerAvatarUpload) {
    triggerAvatarUpload.addEventListener('click', () => avatarFileInput.click());
  }

  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', async () => {
      const file = avatarFileInput.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const data = await api('/api/users/avatar', {
          method: 'POST',
          body: formData,
        });

        showToast('Avatar updated!');
        editAvatarPreview.src = data.user.avatar;
        profileAvatar.src = data.user.avatar;
        profileData.avatar = data.user.avatar;

        const navAvatar = document.getElementById('nav-avatar');
        if (navAvatar) navAvatar.src = data.user.avatar;
        const mobileNavAvatar = document.getElementById('mobile-nav-avatar');
        if (mobileNavAvatar) mobileNavAvatar.src = data.user.avatar;
      } catch (err) {
        showToast(err.message || 'Failed to upload avatar');
      }
    });
  }

  if (removeAvatarBtn) {
    removeAvatarBtn.addEventListener('click', async () => {
      try {
        const data = await api('/api/users/avatar', { method: 'DELETE' });
        showToast('Avatar removed');
        editAvatarPreview.src = data.user.avatar;
        profileAvatar.src = data.user.avatar;
        profileData.avatar = data.user.avatar;

        const navAvatar = document.getElementById('nav-avatar');
        if (navAvatar) navAvatar.src = data.user.avatar;
        const mobileNavAvatar = document.getElementById('mobile-nav-avatar');
        if (mobileNavAvatar) mobileNavAvatar.src = data.user.avatar;
      } catch (err) {
        showToast('Failed to remove avatar');
      }
    });
  }

  
  const settingsModal = document.getElementById('settings-modal');
  const settingsClose = document.getElementById('settings-modal-close');
  const settingsVerifyBtn = document.getElementById('settings-verify-btn');
  const settingsLogoutBtn = document.getElementById('settings-logout-btn');

  const verifyModal = document.getElementById('verify-modal');
  const verifyClose = document.getElementById('verify-modal-close');
  const startPaymentBtn = document.getElementById('start-payment-btn');

  function openSettingsModal() {
    settingsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSettingsModal() {
    settingsModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function openVerifyModal() {
    closeSettingsModal();
    verifyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeVerifyModal() {
    verifyModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (settingsClose) settingsClose.addEventListener('click', closeSettingsModal);
  if (settingsVerifyBtn) settingsVerifyBtn.addEventListener('click', openVerifyModal);
  if (verifyClose) verifyClose.addEventListener('click', closeVerifyModal);

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
  }
  if (verifyModal) {
    verifyModal.addEventListener('click', (e) => {
      if (e.target === verifyModal) closeVerifyModal();
    });
  }

  if (settingsLogoutBtn) {
    settingsLogoutBtn.addEventListener('click', async () => {
      try {
        await api('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      } catch (err) {
        showToast('Error logging out');
      }
    });
  }

  const personalSettingsShortcut = document.getElementById('edit-modal-personal-settings-btn');
  if (personalSettingsShortcut) {
    personalSettingsShortcut.addEventListener('click', () => {
      document.getElementById('edit-modal').classList.remove('active');
      openSettingsModal();
    });
  }

  if (startPaymentBtn) {
    startPaymentBtn.addEventListener('click', async () => {
      const btnText = startPaymentBtn.querySelector('.btn-text');
      const spinner = startPaymentBtn.querySelector('.payment-spinner');
      
      btnText.style.display = 'none';
      spinner.style.display = 'block';
      startPaymentBtn.disabled = true;

      setTimeout(async () => {
        try {
          const response = await api('/api/users/verify/purchase', { method: 'POST' });
          showToast('Verification successful! Badge earned!');
          closeVerifyModal();
          
          profileData.is_verified = 1;
          loadProfile();
        } catch (err) {
          showToast('Payment failed, please try again.');
        } finally {
          btnText.style.display = 'block';
          spinner.style.display = 'none';
          startPaymentBtn.disabled = false;
        }
      }, 2000);
    });
  }


  
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
            <a href="/profile/${u.username}" class="follow-list-item__username" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;">
              ${u.username}
              ${u.is_verified ? `<span class="verified-badge-inline" style="margin-left:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="#0095f6"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></span>` : ''}
            </a>
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

  
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const eyeShow = btn.querySelector('.eye-icon-show');
      const eyeHide = btn.querySelector('.eye-icon-hide');
      
      if (input.type === 'password') {
        input.type = 'text';
        eyeShow.style.display = 'none';
        eyeHide.style.display = 'block';
      } else {
        input.type = 'password';
        eyeShow.style.display = 'block';
        eyeHide.style.display = 'none';
      }
    });
  });

  
  await loadProfile();
})();


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
