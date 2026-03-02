// ============================================================
// index.js — Landing Page JavaScript
// Handles: Slideshow, Login modal, Login form submission
// ============================================================

// ─────────────────────────────────────────────────────────────
// SLIDESHOW
// ─────────────────────────────────────────────────────────────
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');

function goToSlide(n) {
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => {
    d.classList.remove('active');
    d.setAttribute('aria-selected', 'false');
  });

  currentSlide = ((n % slides.length) + slides.length) % slides.length;

  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
  dots[currentSlide].setAttribute('aria-selected', 'true');
}

function nextSlide() {
  goToSlide(currentSlide + 1);
}

// Auto-advance every 8 seconds
const slideshowTimer = setInterval(nextSlide, 8000);

// Pause on hover
const slideshowSection = document.querySelector('.slideshow-section');
if (slideshowSection) {
  slideshowSection.addEventListener('mouseenter', () => clearInterval(slideshowTimer));
  slideshowSection.addEventListener('mouseleave', () => setInterval(nextSlide, 8000));
}

// ─────────────────────────────────────────────────────────────
// LOGIN MODAL CONTROLS
// ─────────────────────────────────────────────────────────────
function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('login-form').reset();
  setTimeout(() => document.getElementById('loginUsername').focus(), 100);
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
  document.getElementById('loginError').style.display = 'none';
}

// Close on overlay click
document.getElementById('loginModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeLoginModal();
});

// Close with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLoginModal();
});

// ─────────────────────────────────────────────────────────────
// ROLE TAB SWITCHING
// ─────────────────────────────────────────────────────────────
function switchTab(role) {
  document.getElementById('loginRole').value = role;

  document.getElementById('tab-student').classList.toggle('active', role === 'student');
  document.getElementById('tab-admin').classList.toggle('active', role === 'admin');

  const hint = document.getElementById('loginHint');
  if (role === 'student') {
    hint.innerHTML = '<strong>Student demo:</strong> username: <code>student</code> / password: <code>student123</code>';
  } else {
    hint.innerHTML = '<strong>Admin demo:</strong> username: <code>admin</code> / password: <code>admin123</code>';
  }

  document.getElementById('loginError').style.display = 'none';
}

// ─────────────────────────────────────────────────────────────
// HANDLE LOGIN
// ─────────────────────────────────────────────────────────────
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const role = document.getElementById('loginRole').value;

  const errorEl = document.getElementById('loginError');
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!username || !password) {
    errorEl.textContent = 'Please enter both username and password.';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',                 // ← Required for cookies/session
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showToast(`Welcome, ${data.role}! Redirecting...`, 3000);

      // Redirect based on role from server
      setTimeout(() => {
        if (data.role === 'admin') {
          window.location.href = '/admin.html';
        } else {
          window.location.href = '/student.html';
        }
      }, 1200);
    } else {
      errorEl.textContent = data.message || 'Invalid credentials';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In →';
    }
  } catch (err) {
    errorEl.textContent = 'Cannot connect to server. Is the backend running?';
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In →';
    console.error('Login error:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// TOAST NOTIFICATION
// ─────────────────────────────────────────────────────────────
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Login button
  document.getElementById('openLoginBtn').addEventListener('click', (e) => {
    e.preventDefault();
    openLoginModal();
  });

  // Form submit
  document.getElementById('login-form').addEventListener('submit', handleLogin);
});