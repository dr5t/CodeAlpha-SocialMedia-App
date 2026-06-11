// ============================================
// Vibe Social — Explore Page Logic
// ============================================

(async function() {
  const authenticated = await checkAuth();
  if (!authenticated) return;
  initApp();

  const grid = document.getElementById('explore-grid');
  const loader = document.getElementById('explore-loader');

  let page = 1;
  let loading = false;
  let hasMore = true;

  async function loadExplore() {
    if (loading || !hasMore) return;
    loading = true;
    loader.style.display = 'flex';

    try {
      const data = await api(`/api/posts/explore?page=${page}`);
      const posts = data.posts || [];

      posts.forEach(post => {
        const item = document.createElement('a');
        item.className = 'explore-grid__item fade-in';
        item.href = `/post/${post.id}`;
        item.innerHTML = `
          <img src="${post.image_path}" alt="Post by ${post.username}" loading="lazy">
          <div class="explore-grid__overlay">
            <div class="explore-grid__stat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              ${formatNumber(post.like_count)}
            </div>
            <div class="explore-grid__stat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${formatNumber(post.comment_count)}
            </div>
          </div>
        `;
        grid.appendChild(item);
      });

      hasMore = data.hasMore;
      page++;
    } catch (err) {
      console.error('Explore error:', err);
    }

    loader.style.display = 'none';
    loading = false;
  }

  // Infinite scroll
  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      loadExplore();
    }
  });

  await loadExplore();
})();
