// ============================================================
// index.js — Landing Page JavaScript
// Handles: Image slideshow, Login modal, Login form submit
// ============================================================

// ─────────────────────────────────────────────────────────────
// SLIDESHOW
// Three slides that cycle every 8 seconds automatically.
// ─────────────────────────────────────────────────────────────

/** The index of the currently displayed slide (0-based) */
let currentSlide = 0;

/** All <div class="slide"> elements */
const slides = document.querySelectorAll('.slide');

/** All <button class="dot"> elements */
const dots   = document.querySelectorAll('.dot');

/**
 * goToSlide(n) — Displays slide number n.
 * Removes 'active' from all slides/dots, then adds it to index n.
 * @param {number} n - The slide index to display
 */
function goToSlide(n) {
  // Remove active state from all slides and dots
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => {
    d.classList.remove('active');
    d.setAttribute('aria-selected', 'false');
  });

  // Clamp n to a valid range using modulo
  currentSlide = ((n % slides.length) + slides.length) % slides.length;

  // Activate the target slide and its corresponding dot
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
  dots[currentSlide].setAttribute('aria-selected', 'true');
}

/**
 * nextSlide() — Advances to the next slide.
 * Called automatically by the interval timer.
 */
function nextSlide() {
  goToSlide(currentSlide + 1);
}

// Start the auto-advance timer: 8 seconds per slide
const slideshowTimer = setInterval(nextSlide, 8000);

// Pause slideshow when user hovers over it (better UX)
const slideshowSection = document.querySelector('.slideshow-section');
if (slideshowSection) {
  slideshowSection.addEventListener('mouseenter', () => clearInterval(slideshowTimer));
}


// ─────────────────────────────────────────────────────────────
// LOGIN MODAL
// ─────────────────────────────────────────────────────────────

/** Opens the login modal */
function openLoginModal() {
  const modal = document.getElementById('loginModal');
  modal.classList.remove('hidden');
  // Focus the first input for accessibility
  setTimeout(() => document.getElementById('loginUsername').focus(), 100);
}

/** Closes the login modal and resets form */
function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  modal.classList.add('hidden');
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

// Close modal if user clicks the dark overlay (outside the box)
document.getElementById('loginModal').addEventListener('click', function(e) {
  if (e.target === this) closeLoginModal();
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeLoginModal();
});


/**
 * switchTab(role) — Switches between 'student' and 'admin' login tabs.
 * Updates the hidden field, hint text, and tab button styles.
 * @param {string} role - 'student' or 'admin'
 */
function switchTab(role) {
  // Update hidden role input
  document.getElementById('loginRole').value = role;

  // Toggle tab active styles
  document.getElementById('tab-student').classList.toggle('active', role === 'student');
  document.getElementById('tab-admin').classList.toggle('active',   role === 'admin');

  // Update the hint text for demo credentials
  const hint = document.getElementById('loginHint');
  if (role === 'student') {
    hint.innerHTML = '<strong>Student demo:</strong> username: <code>student</code> / password: <code>student123</code>';
  } else {
    hint.innerHTML = '<strong>Admin demo:</strong> username: <code>admin</code> / password: <code>admin123</code>';
  }

  // Clear any existing error
  document.getElementById('loginError').style.display = 'none';
}


/**
 * handleLogin(event) — Submits login credentials to the API.
 * On success, redirects to the appropriate portal page.
 * @param {Event} event - The form submit event
 */
async function handleLogin(event) {
  event.preventDefault(); // Prevent default page reload

  const role     = document.getElementById('loginRole').value;
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl  = document.getElementById('loginError');

  // Basic client-side validation
  if (!username || !password) {
    errorEl.textContent = 'Please enter both username and password.';
    errorEl.style.display = 'block';
    return;
  }

  // Disable submit button while requesting
  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    // POST credentials to the Express API
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      // Redirect based on the role returned by the server
      if (data.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'student.html';
      }
    } else {
      // Show error message
      errorEl.textContent = data.message || 'Invalid username or password.';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In →';
    }
  } catch (err) {
    // Network / server error
    errorEl.textContent = 'Cannot connect to server. Make sure the Node.js server is running.';
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In →';
  }
}


// ─────────────────────────────────────────────────────────────
// TOAST UTILITY (used across pages)
// ─────────────────────────────────────────────────────────────

/**
 * showToast(message, duration) — Briefly shows a notification
 * @param {string} message - The text to display
 * @param {number} duration - How long to show it in ms (default 3000)
 */
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}
