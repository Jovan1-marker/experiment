// ============================================================
// server.js — Main Express.js Application Server
// Serves static files and handles all REST API requests.
// ============================================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// ─────────────────────────────────────────────────────────────
// SIMPLE AUTH (demo only — hardcoded users)
// Production recommendation: bcrypt + JWT + real user table
// ─────────────────────────────────────────────────────────────
const ADMIN_USER = { username: 'admin', password: 'admin123', role: 'admin' };
const STUDENT_USER = { username: 'student', password: 'student123', role: 'student' };

// Auth middleware factory
const requireAuth = (allowedRoles) => (req, res, next) => {
  const role = req.cookies.userRole;
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({ success: false, message: 'Unauthorized - please login' });
  }
  next();
};

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏥 MIMS API is running',
    endpoints: {
      login: 'POST /api/login',
      logout: 'POST /api/logout',
      me: 'GET /api/me',
      patients: 'GET/POST/PUT/DELETE /api/patients (admin)',
      appointments: 'GET/POST/PATCH/DELETE /api/appointments (student+admin)',
      feedback: 'GET/POST/DELETE /api/feedback (student+admin)',
      records: 'GET/POST/PUT/DELETE /api/records (admin)'
    }
  });
});

// ─────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  let user = null;
  if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
    user = ADMIN_USER;
  } else if (username === STUDENT_USER.username && password === STUDENT_USER.password) {
    user = STUDENT_USER;
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('userRole', user.role, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 3600 * 1000 // 1 hour
  });

  res.cookie('username', user.username, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 3600 * 1000
  });

  res.json({ success: true, role: user.role, message: `Welcome, ${user.role}!` });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('userRole');
  res.clearCookie('username');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/me', (req, res) => {
  const role = req.cookies.userRole;
  const username = req.cookies.username;

  if (!role) {
    return res.status(401).json({ success: false, message: 'Not logged in' });
  }

  res.json({ success: true, username, role });
});

// ─────────────────────────────────────────────────────────────
// PATIENTS API ── ADMIN ONLY
// ─────────────────────────────────────────────────────────────
app.get('/api/patients', requireAuth(['admin']), (req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY id ASC').all();
    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/patients/:id', requireAuth(['admin']), (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/patients', requireAuth(['admin']), (req, res) => {
  try {
    const {
      full_name, lrn, grade_section, height, weight, bmi_status,
      history, clinic_exposure, email, home_address, contact_no
    } = req.body;

    if (!full_name || !lrn) {
      return res.status(400).json({ success: false, message: 'full_name and lrn are required' });
    }

    const result = db.prepare(`
      INSERT INTO patients (
        full_name, lrn, grade_section, height, weight, bmi_status,
        history, clinic_exposure, email, home_address, contact_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full_name, lrn, grade_section || null, height || null, weight || null, bmi_status || null,
      history || null, clinic_exposure || null, email || null, home_address || null, contact_no || null
    );

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/patients/:id', requireAuth(['admin']), (req, res) => {
  try {
    const {
      full_name, lrn, grade_section, height, weight, bmi_status,
      history, clinic_exposure, email, home_address, contact_no
    } = req.body;

    if (!full_name || !lrn) {
      return res.status(400).json({ success: false, message: 'full_name and lrn required' });
    }

    const info = db.prepare(`
      UPDATE patients SET
        full_name=?, lrn=?, grade_section=?, height=?, weight=?, bmi_status=?,
        history=?, clinic_exposure=?, email=?, home_address=?, contact_no=?
      WHERE id=?
    `).run(
      full_name, lrn, grade_section || null, height || null, weight || null, bmi_status || null,
      history || null, clinic_exposure || null, email || null, home_address || null, contact_no || null,
      req.params.id
    );

    if (info.changes === 0) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, message: 'Patient updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/patients/:id', requireAuth(['admin']), (req, res) => {
  try {
    const info = db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, message: 'Patient deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS API ── STUDENT + ADMIN
// ─────────────────────────────────────────────────────────────
app.get('/api/appointments', requireAuth(['admin', 'student']), (req, res) => {
  try {
    const appointments = db.prepare('SELECT * FROM appointments ORDER BY created_at DESC').all();
    res.json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/appointments/student/:name', requireAuth(['admin', 'student']), (req, res) => {
  try {
    const appointments = db.prepare(
      'SELECT * FROM appointments WHERE student_name LIKE ? ORDER BY created_at DESC'
    ).all(`%${req.params.name}%`);
    res.json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/appointments', requireAuth(['admin', 'student']), (req, res) => {
  try {
    const { service_type, student_name, grade, lrn, description } = req.body;

    if (!service_type || !student_name) {
      return res.status(400).json({ success: false, message: 'service_type and student_name required' });
    }

    const result = db.prepare(`
      INSERT INTO appointments (service_type, student_name, grade, lrn, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(service_type, student_name, grade || null, lrn || null, description || null);

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/appointments/:id/status', requireAuth(['admin']), (req, res) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'Approved' or 'Rejected'" });
    }

    const info = db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);
    if (info.changes === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });

    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/appointments/:id', requireAuth(['admin']), (req, res) => {
  try {
    const info = db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// FEEDBACK API ── STUDENT + ADMIN
// ─────────────────────────────────────────────────────────────
app.get('/api/feedback', requireAuth(['admin', 'student']), (req, res) => {
  try {
    const feedback = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all();
    res.json({ success: true, data: feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/feedback', requireAuth(['admin', 'student']), (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    const result = db.prepare('INSERT INTO feedback (message) VALUES (?)').run(message.trim());
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/feedback/:id', requireAuth(['admin']), (req, res) => {
  try {
    const info = db.prepare('DELETE FROM feedback WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, message: 'Feedback deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// RECORDS API ── ADMIN ONLY
// ─────────────────────────────────────────────────────────────
app.get('/api/records', requireAuth(['admin']), (req, res) => {
  try {
    const records = db.prepare('SELECT id, title, created_at, updated_at FROM records ORDER BY updated_at DESC').all();
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/records/:id', requireAuth(['admin']), (req, res) => {
  try {
    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/records', requireAuth(['admin']), (req, res) => {
  try {
    const { title } = req.body;
    const cleanTitle = (title || 'Untitled Record').trim();

    const result = db.prepare('INSERT INTO records (title) VALUES (?)').run(cleanTitle);
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/records/:id', requireAuth(['admin']), (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    const info = db.prepare(`
      UPDATE records
      SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title.trim(), content || null, req.params.id);

    if (info.changes === 0) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Record updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/records/:id', requireAuth(['admin']), (req, res) => {
  try {
    const info = db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🏥 MIMS Server running!`);
  console.log(` Local:     http://localhost:${PORT}`);
  console.log(` Health:    http://localhost:${PORT}/`);
  console.log(` Admin:     http://localhost:${PORT}/admin.html`);
  console.log(` Student:   http://localhost:${PORT}/student.html\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nError: Port ${PORT} is already in use.`);
    console.error('Suggestions:');
    console.error('  1. netstat -ano | findstr :3000   →   taskkill /PID <pid> /F');
    console.error('  2. set PORT=4000 && node server.js');
    process.exit(1);
  } else {
    throw err;
  }
});