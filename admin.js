// ============================================================
// admin.js — Admin Portal JavaScript
// Handles: Patients, Appointments, Waitlist, Records, Feedback
// ============================================================

// ─────────────────────────────────────────────────────────────
// STATE — In-memory cache to avoid re-fetching unnecessarily
// ─────────────────────────────────────────────────────────────
let allPatients     = []; // Full patient list
let currentRecordId = null; // The record currently open in the editor


// ─────────────────────────────────────────────────────────────
// SECTION NAVIGATION (same pattern as student.js)
// ─────────────────────────────────────────────────────────────

function showSection(name) {
  document.querySelectorAll('.portal-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-section]').forEach(b => b.classList.remove('active'));

  const s = document.getElementById('section-' + name);
  if (s) s.classList.add('active');
  const b = document.querySelector(`.nav-item[data-section="${name}"]`);
  if (b) b.classList.add('active');

  // Lazy-load data when the tab is first opened
  if      (name === 'patient')     loadPatients();
  else if (name === 'appointment') loadAppointments();
  else if (name === 'waitlist')    loadWaitlist();
  else if (name === 'record')      loadRecords();
  else if (name === 'feedback')    loadFeedback();
}


// ═══════════════════════════════════════════════════════════════
//  PATIENTS
// ═══════════════════════════════════════════════════════════════

/**
 * loadPatients() — GETs all patients from the API and renders the grid.
 */
async function loadPatients() {
  try {
    const res  = await fetch('/api/patients');
    allPatients = await res.json();
    renderPatientGrid(allPatients);
    renderPatientStats(allPatients);
  } catch (err) {
    document.getElementById('patientGrid').innerHTML =
      `<p style="color:var(--danger);">Error loading patients. Is the server running?</p>`;
    console.error(err);
  }
}

/**
 * renderPatientStats(patients) — Shows summary statistics above the grid
 */
function renderPatientStats(patients) {
  const stats = document.getElementById('patientStats');
  const total       = patients.length;
  const normal      = patients.filter(p => p.bmi_status === 'Normal').length;
  const overweight  = patients.filter(p => p.bmi_status === 'Overweight').length;
  const underweight = patients.filter(p => p.bmi_status === 'Underweight').length;

  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Patients</div>
      <div class="stat-value">${total}</div>
      <div class="stat-icon">👤</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Normal BMI</div>
      <div class="stat-value" style="color:#2D6A4F;">${normal}</div>
      <div class="stat-icon">✅</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Overweight</div>
      <div class="stat-value" style="color:#E05C00;">${overweight}</div>
      <div class="stat-icon">⚠️</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Underweight</div>
      <div class="stat-value" style="color:#0077B6;">${underweight}</div>
      <div class="stat-icon">📉</div>
    </div>
  `;
}

/**
 * renderPatientGrid(patients) — Renders patient cards into the grid
 */
function renderPatientGrid(patients) {
  const grid = document.getElementById('patientGrid');

  if (!patients.length) {
    grid.innerHTML = `<p style="color:var(--text-muted); text-align:center; grid-column:1/-1; padding:40px;">No patients found.</p>`;
    return;
  }

  grid.innerHTML = patients.map(p => {
    // Generate initials for the avatar
    const initials = getInitials(p.full_name);

    // BMI badge color class
    const bmiClass =
      p.bmi_status === 'Overweight'  ? 'bmi-overweight'  :
      p.bmi_status === 'Underweight' ? 'bmi-underweight' : 'bmi-normal';

    return `
      <article class="patient-card" aria-label="Patient: ${escapeHtml(p.full_name)}">
        <div class="patient-card-header">
          <div class="patient-avatar" aria-hidden="true">${initials}</div>
          <div>
            <div class="patient-card-name">${escapeHtml(p.full_name)}</div>
            <div class="patient-card-lrn">LRN: ${escapeHtml(p.lrn)}</div>
          </div>
        </div>

        <div class="patient-card-body">
          <div class="field">
            <span class="field-label">Grade/Section</span>
            <span class="field-value">${escapeHtml(p.grade_section || '—')}</span>
          </div>
          <div class="field">
            <span class="field-label">BMI Status</span>
            <span class="field-value ${bmiClass}">${escapeHtml(p.bmi_status || '—')}</span>
          </div>
          <div class="field">
            <span class="field-label">Height</span>
            <span class="field-value">${escapeHtml(p.height || '—')}</span>
          </div>
          <div class="field">
            <span class="field-label">Weight</span>
            <span class="field-value">${escapeHtml(p.weight || '—')}</span>
          </div>
          <div class="field">
            <span class="field-label">Med History</span>
            <span class="field-value">${escapeHtml(p.history || 'None')}</span>
          </div>
          <div class="field">
            <span class="field-label">Clinic Exposure</span>
            <span class="field-value">${escapeHtml(p.clinic_exposure || 'None')}</span>
          </div>
        </div>

        <!-- Sensitive fields shown only if filled in -->
        ${(p.email || p.home_address || p.contact_no) ? `
          <div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--green-light); font-size:0.75rem; color:var(--text-muted);">
            ${p.email       ? `<div>📧 ${escapeHtml(p.email)}</div>` : ''}
            ${p.home_address ? `<div>🏠 ${escapeHtml(p.home_address)}</div>` : ''}
            ${p.contact_no  ? `<div>📞 ${escapeHtml(p.contact_no)}</div>` : ''}
          </div>` : ''}

        <div class="patient-card-actions">
          <button class="btn btn-outline btn-sm" onclick="openEditPatientModal(${p.id})">✏️ Edit</button>
          <button class="btn btn-danger btn-sm"  onclick="deletePatient(${p.id})">🗑 Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * filterPatients(query) — Client-side search filter on cached patient data
 */
function filterPatients(query) {
  if (!query.trim()) {
    renderPatientGrid(allPatients);
    return;
  }
  const q = query.toLowerCase();
  const filtered = allPatients.filter(p =>
    p.full_name.toLowerCase().includes(q) ||
    p.lrn.toLowerCase().includes(q) ||
    (p.grade_section || '').toLowerCase().includes(q)
  );
  renderPatientGrid(filtered);
}


// --- PATIENT MODAL (Add / Edit) ---

/** Opens the modal in "Add" mode */
function openAddPatientModal() {
  // Check patient limit (50 max)
  if (allPatients.length >= 50) {
    showToast('⚠️ Maximum of 50 patients reached.', 4000);
    return;
  }
  clearPatientForm();
  document.getElementById('patientModalTitle').textContent = 'Add New Patient';
  document.getElementById('patientId').value = '';
  document.getElementById('patientModal').classList.remove('hidden');
}

/** Opens the modal in "Edit" mode and fills in existing data */
function openEditPatientModal(id) {
  const p = allPatients.find(x => x.id === id);
  if (!p) return;
  document.getElementById('patientModalTitle').textContent = 'Edit Patient';
  document.getElementById('patientId').value    = p.id;
  document.getElementById('pFullName').value    = p.full_name    || '';
  document.getElementById('pLrn').value         = p.lrn          || '';
  document.getElementById('pGrade').value       = p.grade_section || '';
  document.getElementById('pHeight').value      = p.height       || '';
  document.getElementById('pWeight').value      = p.weight       || '';
  document.getElementById('pBmi').value         = p.bmi_status   || 'Normal';
  document.getElementById('pHistory').value     = p.history      || '';
  document.getElementById('pExposure').value    = p.clinic_exposure || '';
  document.getElementById('pEmail').value       = p.email        || '';
  document.getElementById('pAddress').value     = p.home_address || '';
  document.getElementById('pContact').value     = p.contact_no   || '';
  document.getElementById('patientModal').classList.remove('hidden');
}

function closePatientModal() {
  document.getElementById('patientModal').classList.add('hidden');
  clearPatientForm();
}

function clearPatientForm() {
  document.getElementById('patientForm').reset();
}

/**
 * savePatient(event) — Creates or updates a patient via the API
 */
async function savePatient(event) {
  event.preventDefault();
  const id = document.getElementById('patientId').value;

  const payload = {
    full_name:      document.getElementById('pFullName').value.trim(),
    lrn:            document.getElementById('pLrn').value.trim(),
    grade_section:  document.getElementById('pGrade').value.trim(),
    height:         document.getElementById('pHeight').value.trim(),
    weight:         document.getElementById('pWeight').value.trim(),
    bmi_status:     document.getElementById('pBmi').value,
    history:        document.getElementById('pHistory').value.trim() || 'None',
    clinic_exposure:document.getElementById('pExposure').value.trim() || 'None',
    email:          document.getElementById('pEmail').value.trim(),
    home_address:   document.getElementById('pAddress').value.trim(),
    contact_no:     document.getElementById('pContact').value.trim()
  };

  if (!payload.full_name || !payload.lrn) {
    showToast('⚠️ Full Name and LRN are required.', 3000);
    return;
  }

  try {
    let res;
    if (id) {
      // UPDATE existing patient
      res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // CREATE new patient
      res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (data.success || data.id) {
      showToast(id ? '✅ Patient updated!' : '✅ Patient added!');
      closePatientModal();
      loadPatients(); // Refresh grid
    } else {
      showToast('❌ Error saving patient. LRN might already exist.', 4000);
    }
  } catch (err) {
    showToast('❌ Cannot connect to server.', 4000);
  }
}

/**
 * deletePatient(id) — Deletes a patient after confirmation
 */
async function deletePatient(id) {
  if (!confirm('Delete this patient record? This cannot be undone.')) return;
  try {
    await fetch(`/api/patients/${id}`, { method: 'DELETE' });
    showToast('🗑 Patient deleted.');
    loadPatients();
  } catch (err) {
    showToast('❌ Error deleting patient.', 4000);
  }
}


// ═══════════════════════════════════════════════════════════════
//  APPOINTMENTS INBOX
// ═══════════════════════════════════════════════════════════════

async function loadAppointments() {
  const tbody = document.getElementById('appointmentsBody');
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px;">Loading…</td></tr>`;

  try {
    const res   = await fetch('/api/appointments');
    const appts = await res.json();

    // Update the pending badge count in the sidebar
    const pendingCount = appts.filter(a => a.status === 'Pending').length;
    const badge = document.getElementById('pendingBadge');
    badge.textContent = pendingCount;
    badge.style.display = pendingCount > 0 ? 'inline' : 'none';

    if (!appts.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:30px;">No appointment requests yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = appts.map((a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(a.student_name)}</strong></td>
        <td>${escapeHtml(a.grade || '—')}</td>
        <td><code style="font-size:0.8rem;">${escapeHtml(a.lrn || '—')}</code></td>
        <td>${escapeHtml(a.service_type)}</td>
        <td style="max-width:180px; word-wrap:break-word;">${escapeHtml(a.description || '—')}</td>
        <td style="white-space:nowrap;">${formatDate(a.created_at)}</td>
        <td>${statusBadge(a.status)}</td>
        <td>
          ${a.status === 'Pending' ? `
            <div style="display:flex; gap:6px;">
              <button class="btn btn-primary btn-sm" onclick="updateAppointmentStatus(${a.id}, 'Approved')">✅ Approve</button>
              <button class="btn btn-danger btn-sm"  onclick="updateAppointmentStatus(${a.id}, 'Rejected')">❌ Reject</button>
            </div>` : `
            <button class="btn btn-outline btn-sm" onclick="deleteAppointment(${a.id})">🗑 Remove</button>`
          }
        </td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:var(--danger); text-align:center; padding:20px;">Error loading appointments.</td></tr>`;
  }
}

/**
 * updateAppointmentStatus(id, status) — Approve or Reject an appointment
 * Approving automatically moves it to the Waitlist section.
 */
async function updateAppointmentStatus(id, status) {
  try {
    const res  = await fetch(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      showToast(status === 'Approved'
        ? '✅ Appointment approved and added to Waitlist!'
        : '❌ Appointment rejected.');
      loadAppointments(); // Refresh inbox
    }
  } catch (err) {
    showToast('❌ Error updating status.', 4000);
  }
}

async function deleteAppointment(id) {
  if (!confirm('Remove this appointment from the list?')) return;
  await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
  showToast('🗑 Appointment removed.');
  loadAppointments();
}


// ═══════════════════════════════════════════════════════════════
//  WAITLIST
// ═══════════════════════════════════════════════════════════════

async function loadWaitlist() {
  const tbody = document.getElementById('waitlistBody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Loading…</td></tr>`;

  try {
    const res   = await fetch('/api/appointments/waitlist');
    const items = await res.json();

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No approved appointments yet. Approve some from the Appointment tab.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map((a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(a.student_name)}</strong></td>
        <td>${escapeHtml(a.grade || '—')}</td>
        <td><code style="font-size:0.8rem;">${escapeHtml(a.lrn || '—')}</code></td>
        <td>${escapeHtml(a.service_type)}</td>
        <td style="max-width:200px; word-wrap:break-word;">${escapeHtml(a.description || '—')}</td>
        <td>${formatDate(a.created_at)}</td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger); text-align:center; padding:20px;">Error loading waitlist.</td></tr>`;
  }
}


// ═══════════════════════════════════════════════════════════════
//  RECORD FILE MANAGER
// ═══════════════════════════════════════════════════════════════

/**
 * loadRecords() — Fetches and displays all records as file icons
 */
async function loadRecords() {
  const grid = document.getElementById('recordsGrid');
  grid.innerHTML = `<p style="color:var(--text-muted);">Loading…</p>`;

  try {
    const res     = await fetch('/api/records');
    const records = await res.json();

    if (!records.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:50px; color:var(--text-muted);">
          <div style="font-size:3rem; margin-bottom:12px;">📁</div>
          <p>No records yet. Click "Create New Record" to start.</p>
        </div>`;
      return;
    }

    grid.innerHTML = records.map(r => `
      <div class="record-file" onclick="openRecord(${r.id})" role="button" tabindex="0"
           aria-label="Open record: ${escapeHtml(r.title)}"
           onkeydown="if(event.key==='Enter')openRecord(${r.id})">
        <div class="file-icon" aria-hidden="true">📄</div>
        <div class="file-name">${escapeHtml(r.title)}</div>
        <div class="file-date">${formatDate(r.updated_at)}</div>
        <!-- Delete button (appears on hover via CSS) -->
        <button class="file-delete"
                onclick="event.stopPropagation(); deleteRecord(${r.id})"
                aria-label="Delete record ${escapeHtml(r.title)}">✕</button>
      </div>
    `).join('');

  } catch (err) {
    grid.innerHTML = `<p style="color:var(--danger);">Error loading records.</p>`;
  }
}

/**
 * createNewRecord() — Creates a blank record via API and opens the editor
 */
async function createNewRecord() {
  try {
    const res  = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled Record' })
    });
    const data = await res.json();
    if (data.id) {
      // Open the newly created record in the editor immediately
      openRecord(data.id);
    }
  } catch (err) {
    showToast('❌ Error creating record.', 4000);
  }
}

/**
 * openRecord(id) — Fetches a record's content and opens the text editor
 */
async function openRecord(id) {
  try {
    const res    = await fetch(`/api/records/${id}`);
    const record = await res.json();

    // Store the current record's ID so saveRecord() knows what to save
    currentRecordId = record.id;

    // Fill in the editor fields
    document.getElementById('editorTitle').value    = record.title   || 'Untitled Record';
    document.getElementById('editorTextarea').value = record.content || '';

    // Switch view: hide grid, show editor
    document.getElementById('recordsGridView').classList.add('hidden');
    document.getElementById('recordEditorView').classList.remove('hidden');
    // Focus the textarea
    document.getElementById('editorTextarea').focus();

  } catch (err) {
    showToast('❌ Error opening record.', 4000);
  }
}

/**
 * saveRecord() — Saves the current editor content to the API
 */
async function saveRecord() {
  if (!currentRecordId) return;
  const title   = document.getElementById('editorTitle').value.trim()    || 'Untitled Record';
  const content = document.getElementById('editorTextarea').value;

  try {
    const res  = await fetch(`/api/records/${currentRecordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    const data = await res.json();
    if (data.success) {
      showToast('💾 Record saved!');
    }
  } catch (err) {
    showToast('❌ Error saving record.', 4000);
  }
}

/**
 * closeEditor() — Saves and goes back to the file grid
 */
function closeEditor() {
  saveRecord().then(() => {
    document.getElementById('recordEditorView').classList.add('hidden');
    document.getElementById('recordsGridView').classList.remove('hidden');
    currentRecordId = null;
    loadRecords(); // Refresh grid to show updated timestamp
  });
}

/**
 * deleteCurrentRecord() — Deletes the record currently open in the editor
 */
async function deleteCurrentRecord() {
  if (!currentRecordId) return;
  if (!confirm('Delete this record permanently?')) return;
  await deleteRecord(currentRecordId, true);
}

/**
 * deleteRecord(id, fromEditor) — Deletes a record by id
 */
async function deleteRecord(id, fromEditor = false) {
  if (!fromEditor && !confirm('Delete this record permanently?')) return;
  try {
    await fetch(`/api/records/${id}`, { method: 'DELETE' });
    showToast('🗑 Record deleted.');
    if (fromEditor) {
      document.getElementById('recordEditorView').classList.add('hidden');
      document.getElementById('recordsGridView').classList.remove('hidden');
      currentRecordId = null;
    }
    loadRecords();
  } catch (err) {
    showToast('❌ Error deleting record.', 4000);
  }
}


// ═══════════════════════════════════════════════════════════════
//  FEEDBACK
// ═══════════════════════════════════════════════════════════════

async function loadFeedback() {
  const tbody = document.getElementById('feedbackBody');
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Loading…</td></tr>`;

  try {
    const res   = await fetch('/api/feedback');
    const items = await res.json();

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:30px;">No feedback messages yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map((f, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="max-width:400px; word-wrap:break-word; white-space:pre-wrap;">${escapeHtml(f.message)}</td>
        <td style="white-space:nowrap;">${formatDate(f.created_at)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteFeedback(${f.id})">🗑 Delete</button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger); text-align:center; padding:20px;">Error loading feedback.</td></tr>`;
  }
}

async function deleteFeedback(id) {
  if (!confirm('Delete this feedback message?')) return;
  await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
  showToast('🗑 Feedback deleted.');
  loadFeedback();
}


// ─────────────────────────────────────────────────────────────
// LOG OUT
// ─────────────────────────────────────────────────────────────
function logout() {
  if (confirm('Are you sure you want to log out?')) {
    window.location.href = 'index.html';
  }
}


// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** getInitials(name) — Returns first 2 initials from a full name */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusBadge(status) {
  const map = { 'Pending': 'badge-pending', 'Approved': 'badge-approved', 'Rejected': 'badge-rejected' };
  return `<span class="badge ${map[status] || 'badge-pending'}">${escapeHtml(status)}</span>`;
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// Close patient modal on overlay click
document.getElementById('patientModal').addEventListener('click', function(e) {
  if (e.target === this) closePatientModal();
});


// ─────────────────────────────────────────────────────────────
// INITIALISE — Load patients when page first opens
// ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadPatients();         // Load patient grid on startup
  loadAppointments();     // Also silently load appointments to show badge count
});
