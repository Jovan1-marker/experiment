// ============================================================
// student.js — Student Portal JavaScript
// Handles: section navigation, appointment submit,
//          appointment lookup, feedback submit
// ============================================================

// ─────────────────────────────────────────────────────────────
// SIDEBAR NAVIGATION
// Each sidebar button calls showSection(name) to switch panels.
// ─────────────────────────────────────────────────────────────

/**
 * showSection(name) — Shows one portal section and hides all others.
 * Also updates the active state on the sidebar nav items.
 * @param {string} name - The section key (matches data-section attribute)
 */
function showSection(name) {
  // Hide all sections
  document.querySelectorAll('.portal-section').forEach(s => {
    s.classList.remove('active');
  });
  // Deactivate all nav items
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show the target section
  const targetSection = document.getElementById('section-' + name);
  if (targetSection) targetSection.classList.add('active');

  // Activate the matching nav button
  const targetNav = document.querySelector(`.nav-item[data-section="${name}"]`);
  if (targetNav) targetNav.classList.add('active');
}


// ─────────────────────────────────────────────────────────────
// MY APPOINTMENTS — Student lookup
// ─────────────────────────────────────────────────────────────

/**
 * loadStudentAppointments(nameQuery)
 * Fetches appointments from the API filtered by student name.
 * Renders the results into the appointments table.
 * @param {string} nameQuery - The student name to search
 */
async function loadStudentAppointments(nameQuery) {
  const tbody = document.getElementById('studentAppointmentsBody');

  // If no name entered, show a prompt
  if (!nameQuery || nameQuery.trim() === '') {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">
          Enter your name above and click Search to view your appointments.
        </td>
      </tr>`;
    return;
  }

  // Show loading state
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Loading…</td></tr>`;

  try {
    const response = await fetch(`/api/appointments/student/${encodeURIComponent(nameQuery.trim())}`);
    const data     = await response.json();

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">
            No appointments found for "<strong>${escapeHtml(nameQuery)}</strong>".
          </td>
        </tr>`;
      return;
    }

    // Build table rows
    tbody.innerHTML = data.map((appt, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(appt.service_type)}</td>
        <td>${escapeHtml(appt.grade || '—')}</td>
        <td><code style="font-size:0.8rem;">${escapeHtml(appt.lrn || '—')}</code></td>
        <td style="max-width:200px; word-wrap:break-word; white-space:pre-wrap;">${escapeHtml(appt.description || '—')}</td>
        <td style="white-space:nowrap;">${formatDate(appt.created_at)}</td>
        <td>${statusBadge(appt.status)}</td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:var(--danger); padding:20px;">
          Error loading appointments. Is the server running?
        </td>
      </tr>`;
    console.error('Appointment fetch error:', err);
  }
}


// ─────────────────────────────────────────────────────────────
// SUBMIT APPOINTMENT REQUEST
// ─────────────────────────────────────────────────────────────

/**
 * submitAppointment(event)
 * Collects form data and POSTs it to /api/appointments.
 * Resets the form on success.
 * @param {Event} event - The form submit event
 */
async function submitAppointment(event) {
  event.preventDefault();

  const form = document.getElementById('appointmentForm');

  // Collect field values
  const payload = {
    service_type: document.getElementById('serviceType').value,
    student_name: document.getElementById('studentName').value.trim(),
    grade:        document.getElementById('studentGrade').value.trim(),
    lrn:          document.getElementById('studentLrn').value.trim(),
    description:  document.getElementById('apptDescription').value.trim()
  };

  // Client-side validation — check nothing is empty
  for (const [key, val] of Object.entries(payload)) {
    if (!val) {
      showToast('⚠️ Please fill in all required fields.', 3000);
      return;
    }
  }

  try {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (data.success) {
      showToast('✅ Appointment request submitted! Wait for admin approval.');
      form.reset(); // Clear the form
      // Go back to "My Appointments" so student can see their request
      showSection('appointments');
    } else {
      showToast('❌ Failed to submit. Try again.', 4000);
    }
  } catch (err) {
    showToast('❌ Cannot connect to server.', 4000);
    console.error('Submit error:', err);
  }
}


// ─────────────────────────────────────────────────────────────
// SUBMIT FEEDBACK / COMMENT
// ─────────────────────────────────────────────────────────────

/**
 * submitFeedback(event)
 * POSTs feedback message to /api/feedback.
 * @param {Event} event - The form submit event
 */
async function submitFeedback(event) {
  event.preventDefault();

  const message = document.getElementById('feedbackMessage').value.trim();

  if (!message) {
    showToast('⚠️ Please write a message before sending.', 3000);
    return;
  }

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await response.json();

    if (data.success) {
      showToast('✅ Feedback sent! Thank you for your comment.');
      document.getElementById('feedbackForm').reset();
    } else {
      showToast('❌ Failed to send feedback. Try again.', 4000);
    }
  } catch (err) {
    showToast('❌ Cannot connect to server.', 4000);
  }
}


// ─────────────────────────────────────────────────────────────
// LOG OUT
// ─────────────────────────────────────────────────────────────

/** logout() — Redirects back to the landing page */
function logout() {
  if (confirm('Are you sure you want to log out?')) {
    window.location.href = 'index.html';
  }
}


// ─────────────────────────────────────────────────────────────
// HELPER / UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * statusBadge(status) — Returns HTML for a color-coded status badge
 * @param {string} status - 'Pending', 'Approved', or 'Rejected'
 * @returns {string} HTML string
 */
function statusBadge(status) {
  const map = {
    'Pending':  'badge-pending',
    'Approved': 'badge-approved',
    'Rejected': 'badge-rejected'
  };
  const cls = map[status] || 'badge-pending';
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

/**
 * formatDate(isoString) — Formats a SQLite datetime string for display
 * @param {string} isoString
 * @returns {string} Human-readable date
 */
function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

/**
 * escapeHtml(str) — Prevents XSS by escaping HTML special characters
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * showToast(message, duration) — Brief notification at bottom-right
 */
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}
