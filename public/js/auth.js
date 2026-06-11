// ============================================
// Vibe Social — Auth Page Logic
// ============================================

(function() {
  // Check if already logged in
  fetch('/api/auth/me')
    .then(res => {
      if (res.ok) window.location.href = '/feed';
    })
    .catch(() => {});

  // Toggle between login and register
  const loginCard = document.getElementById('login-card');
  const registerCard = document.getElementById('register-card');
  const loginSwitch = document.getElementById('login-switch');
  const registerSwitch = document.getElementById('register-switch');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');

  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginCard.style.display = 'none';
    loginSwitch.style.display = 'none';
    registerCard.style.display = 'block';
    registerSwitch.style.display = 'block';
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerCard.style.display = 'none';
    registerSwitch.style.display = 'none';
    loginCard.style.display = 'block';
    loginSwitch.style.display = 'block';
  });

  // Login form
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      loginError.textContent = 'Please fill in all fields';
      return;
    }

    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        loginError.textContent = data.error || 'Login failed';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Log In';
        return;
      }

      window.location.href = '/feed';
    } catch (err) {
      loginError.textContent = 'Network error. Please try again.';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Log In';
    }
  });

  // Register form
  const registerForm = document.getElementById('register-form');
  const registerError = document.getElementById('register-error');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';

    const email = document.getElementById('register-email').value.trim();
    const displayName = document.getElementById('register-name').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;

    if (!email || !displayName || !username || !password) {
      registerError.textContent = 'Please fill in all fields';
      return;
    }

    const registerBtn = document.getElementById('register-btn');
    registerBtn.disabled = true;
    registerBtn.textContent = 'Signing up...';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        registerError.textContent = data.error || 'Registration failed';
        registerBtn.disabled = false;
        registerBtn.textContent = 'Sign up';
        return;
      }

      window.location.href = '/feed';
    } catch (err) {
      registerError.textContent = 'Network error. Please try again.';
      registerBtn.disabled = false;
      registerBtn.textContent = 'Sign up';
    }
  });

  // Toggle password visibility helper
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
})();
