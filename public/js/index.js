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
let slideshowTimer = setInterval(nextSlide, 8000);
const slideshowSection = document.querySelector('.slideshow-section');
if (slideshowSection) {
  slideshowSection.addEventListener('mouseenter', () => clearInterval(slideshowTimer));
  slideshowSection.addEventListener('mouseleave', () => {
    slideshowTimer = setInterval(nextSlide, 8000);
  });
}
function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
  switchTab('student');
}
function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('signupError').style.display = 'none';
  document.getElementById('login-form').reset();
  document.getElementById('signup-form').reset();
}
document.getElementById('loginModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeLoginModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLoginModal();
});
function switchTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('signup-form').classList.add('hidden');

  if (tab === 'student') {
    document.getElementById('tab-student').classList.add('active');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('loginRole').value = 'student';
  } else if (tab === 'admin') {
    document.getElementById('tab-admin').classList.add('active');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('loginRole').value = 'admin';
  } else if (tab === 'signup') {
    document.getElementById('tab-signup').classList.add('active');
    document.getElementById('signup-form').classList.remove('hidden');
  }
}
async function handleLogin(e) {
  e.preventDefault();
  const role = document.getElementById('loginRole').value;
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!username || !password) {
    document.getElementById('loginError').textContent = 'Please fill in all fields';
    document.getElementById('loginError').style.display = 'block';
    return;
  }
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid credentials');
    showToast('Login successful', 'success');
    setTimeout(() => {
      window.location.href = role === 'admin' ? '/admin.html' : '/student.html';
    }, 800);
  } catch (err) {
    document.getElementById('loginError').textContent = err.message;
    document.getElementById('loginError').style.display = 'block';
  }
}
async function handleSignup(e) {
  e.preventDefault();
  const lrn = document.getElementById('signupLrn').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  if (lrn.length !== 12 || !/^\d{12}$/.test(lrn)) {
    document.getElementById('signupError').textContent = 'LRN must be exactly 12 digits';
    document.getElementById('signupError').style.display = 'block';
    return;
  }
  if (password.length < 6) {
    document.getElementById('signupError').textContent = 'Password must be at least 6 characters';
    document.getElementById('signupError').style.display = 'block';
    return;
  }
  if (password !== confirm) {
    document.getElementById('signupError').textContent = 'Passwords do not match';
    document.getElementById('signupError').style.display = 'block';
    return;
  }
  try {
    const res = await fetch('/api/student/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lrn, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    showToast('Account created! You can now sign in.', 'success');
    setTimeout(() => switchTab('student'), 1500);
  } catch (err) {
    document.getElementById('signupError').textContent = err.message;
    document.getElementById('signupError').style.display = 'block';
  }
}
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.className = 'toast', 3000);
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('openLoginBtn').addEventListener('click', (e) => {
    e.preventDefault();
    openLoginModal();
  });
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('signup-form').addEventListener('submit', handleSignup);
});