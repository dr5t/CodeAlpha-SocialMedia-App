// ============================================
// Vibe Social — Shared App Utilities
// ============================================

// --- Current user state ---
let currentUser = null;

// --- API helper ---
async function api(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  // Don't set Content-Type for FormData (let browser set boundary)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// --- Auth check ---
async function checkAuth() {
  try {
    const data = await api('/api/auth/me');
    currentUser = data.user;
    updateNavUser();
    return true;
  } catch {
    window.location.href = '/';
    return false;
  }
}

// --- Update nav with current user ---
function updateNavUser() {
  if (!currentUser) return;

  const navAvatar = document.getElementById('nav-avatar');
  const mobileNavAvatar = document.getElementById('mobile-nav-avatar');
  const navProfileLink = document.getElementById('nav-profile-link');
  const mobileProfileLink = document.getElementById('mobile-profile-link');

  if (navAvatar) navAvatar.src = currentUser.avatar;
  if (mobileNavAvatar) mobileNavAvatar.src = currentUser.avatar;
  if (navProfileLink) navProfileLink.href = '/profile/' + currentUser.username;
  if (mobileProfileLink) mobileProfileLink.href = '/profile/' + currentUser.username;
}

// --- Logout ---
function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await api('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      } catch (err) {
        console.error('Logout error:', err);
      }
    });
  }
}

// --- Search ---
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  if (!searchInput || !searchResults) return;

  let debounceTimer;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = searchInput.value.trim();

    if (q.length < 1) {
      searchResults.classList.remove('active');
      searchResults.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const data = await api(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (data.users.length === 0) {
          searchResults.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">No results found</div>';
        } else {
          searchResults.innerHTML = data.users.map(user => `
            <a href="/profile/${user.username}" class="search-result-item" style="text-decoration:none;color:inherit;">
              <img src="${user.avatar}" alt="${user.username}">
              <div class="search-result-item__info">
                <div class="search-result-item__username" style="display:inline-flex;align-items:center;gap:4px;">
                  ${user.username}
                  ${user.is_verified ? `<span class="verified-badge-inline"><svg width="12" height="12" viewBox="0 0 24 24" fill="#0095f6"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></span>` : ''}
                </div>
                <div class="search-result-item__name">${user.display_name}</div>
              </div>
            </a>
          `).join('');
        }
        searchResults.classList.add('active');
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);
  });

  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-container')) {
      searchResults.classList.remove('active');
    }
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length > 0 && searchResults.innerHTML) {
      searchResults.classList.add('active');
    }
  });
}

// --- Create Post Modal ---
function setupCreatePost() {
  const createBtn = document.getElementById('create-post-btn');
  const createBtnMobile = document.getElementById('create-post-btn-mobile');
  const modal = document.getElementById('create-modal');
  const closeBtn = document.getElementById('create-modal-close');
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const selectFileBtn = document.getElementById('select-file-btn');
  const captionInput = document.getElementById('caption-input');
  const shareBtn = document.getElementById('share-post-btn');

  if (!modal) return;

  let selectedFile = null;

  function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    resetModal();
  }

  function resetModal() {
    selectedFile = null;
    uploadArea.innerHTML = `
      <span class="upload-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></span>
      <p class="upload-text">Drag photos here</p>
      <button type="button" class="upload-btn-inline" id="select-file-btn">Select from computer</button>
    `;
    uploadArea.classList.remove('has-image');
    captionInput.style.display = 'none';
    captionInput.value = '';
    shareBtn.disabled = true;

    // Re-attach event listener to new select button
    const newSelectBtn = document.getElementById('select-file-btn');
    if (newSelectBtn) {
      newSelectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }
  }

  if (createBtn) createBtn.addEventListener('click', openModal);
  if (createBtnMobile) createBtnMobile.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (selectFileBtn) {
    selectFileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  uploadArea.addEventListener('click', () => {
    if (!selectedFile) fileInput.click();
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--accent)';
    uploadArea.style.background = 'var(--accent-light)';
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '';
    uploadArea.style.background = '';
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    uploadArea.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) {
      handleFileSelect(fileInput.files[0]);
    }
  });

  function handleFileSelect(file) {
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadArea.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      uploadArea.classList.add('has-image');
      captionInput.style.display = 'block';
      shareBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  shareBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    shareBtn.disabled = true;
    shareBtn.textContent = 'Sharing...';

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('caption', captionInput.value);

      await api('/api/posts', {
        method: 'POST',
        body: formData,
      });

      closeModal();
      showToast('Post shared!');

      // Reload the page to show new post
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      showToast('Failed to share post');
      shareBtn.disabled = false;
      shareBtn.textContent = 'Share';
    }
  });
}

// --- Toast notification ---
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3000);
}

// --- Relative time ---
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  if (diffWeek < 4) return `${diffWeek}w`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fullDate(dateStr) {
  const date = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// --- Like button SVGs ---
const heartOutlineSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

const heartFilledSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="var(--like-red)" stroke="var(--like-red)" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

const commentSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

const shareSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

const bookmarkSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

// --- Skeleton loaders ---
function createPostSkeleton() {
  return `
    <div class="skeleton-post fade-in">
      <div class="skeleton-post__header">
        <div class="skeleton skeleton-avatar"></div>
        <div>
          <div class="skeleton skeleton-text skeleton-text--short" style="margin-bottom:6px;"></div>
          <div class="skeleton skeleton-text" style="width:50px;height:10px;"></div>
        </div>
      </div>
      <div class="skeleton skeleton-image"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-text skeleton-text--medium"></div>
        <div class="skeleton skeleton-text skeleton-text--long"></div>
      </div>
    </div>
  `;
}

// --- Number formatter ---
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// --- Initialize common features ---
function initApp() {
  setupLogout();
  setupSearch();
  setupCreatePost();
}
