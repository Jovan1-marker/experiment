// ============================================================
// server.js — Main Express.js Application Server
// Serves static files and handles all REST API requests.
// ============================================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database'); // Our database module (better-sqlite3)

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));           // Parse JSON, limit size
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve HTML/CSS/JS

// Simple root route / health check
app.get('/', (req, res) => {
  res.json({
    message: '🏥 MIMS API is running',
    endpoints: {
      login: 'POST /api/login',
      patients: 'GET/POST/PUT/DELETE /api/patients',
      appointments: 'GET/POST/PATCH/DELETE /api/appointments',
      feedback: 'GET/POST/DELETE /api/feedback',
      records: 'GET/POST/PUT/DELETE /api/records'
    }
  });
});

// ─────────────────────────────────────────────────────────────
// ❗ SIMPLE AUTH — Hardcoded for demo only!
// In production: use JWT, bcrypt, sessions, etc.
// ─────────────────────────────────────────────────────────────
const ADMIN_USER = { username: 'admin', password: 'admin123', role: 'admin' };
const STUDENT_USER = { username: 'student', password: 'student123', role: 'student' };

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
    return res.json({ success: true, role: 'admin' });
  }
  if (username === STUDENT_USER.username && password === STUDENT_USER.password) {
    return res.json({ success: true, role: 'student' });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// ═══════════════════════════════════════════════════════════════
// PATIENTS API
// ═══════════════════════════════════════════════════════════════
app.get('/api/patients', (req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY id ASC').all();
    res.json(patients);
  } catch (err) {
    console.error('GET /patients error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/patients/:id', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    console.error('GET /patients/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/patients', (req, res) => {
  try {
    const {
      full_name, lrn, grade_section, height, weight, bmi_status,
      history, clinic_exposure, email, home_address, contact_no
    } = req.body;

    // Basic validation
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
    console.error('POST /patients error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/patients/:id', (req, res) => {
  try {
    const {
      full_name, lrn, grade_section, height, weight, bmi_status,
      history, clinic_exposure, email, home_address, contact_no
    } = req.body;

    if (!full_name || !lrn) {
      return res.status(400).json({ success: false, message: 'full_name and lrn are required' });
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

    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /patients/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/patients/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /patients/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// APPOINTMENTS API
// ═══════════════════════════════════════════════════════════════
app.get('/api/appointments', (req, res) => {
  try {
    const appts = db.prepare('SELECT * FROM appointments ORDER BY created_at DESC').all();
    res.json(appts);
  } catch (err) {
    console.error('GET /appointments error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/appointments/student/:name', (req, res) => {
  try {
    const appts = db.prepare(
      'SELECT * FROM appointments WHERE student_name LIKE ? ORDER BY created_at DESC'
    ).all(`%${req.params.name}%`);
    res.json(appts);
  } catch (err) {
    console.error('GET /appointments/student error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/appointments/waitlist', (req, res) => {
  try {
    const waitlist = db.prepare(
      "SELECT * FROM appointments WHERE status = 'Approved' ORDER BY created_at DESC"
    ).all();
    res.json(waitlist);
  } catch (err) {
    console.error('GET /appointments/waitlist error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/appointments', (req, res) => {
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
    console.error('POST /appointments error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/appointments/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'Approved' or 'Rejected'" });
    }

    const info = db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);
    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /appointments/:id/status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/appointments/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /appointments/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// FEEDBACK API
// ═══════════════════════════════════════════════════════════════
app.get('/api/feedback', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all();
    res.json(items);
  } catch (err) {
    console.error('GET /feedback error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/feedback', (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    const result = db.prepare('INSERT INTO feedback (message) VALUES (?)').run(message.trim());
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('POST /feedback error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/feedback/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM feedback WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /feedback/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// RECORDS API (File Manager)
// ═══════════════════════════════════════════════════════════════
app.get('/api/records', (req, res) => {
  try {
    const records = db.prepare('SELECT id, title, created_at, updated_at FROM records ORDER BY updated_at DESC').all();
    res.json(records);
  } catch (err) {
    console.error('GET /records error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/records/:id', (req, res) => {
  try {
    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json(record);
  } catch (err) {
    console.error('GET /records/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/records', (req, res) => {
  try {
    const { title } = req.body;
    const cleanTitle = (title || 'Untitled Record').trim();

    const result = db.prepare('INSERT INTO records (title) VALUES (?)').run(cleanTitle);
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('POST /records error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/records/:id', (req, res) => {
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

    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /records/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/records/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /records/:id error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// START THE SERVER (with graceful port error handling)
// ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🏥 MIMS Server running!`);
  console.log(` Local:    http://localhost:${PORT}`);
  console.log(` Admin:    http://localhost:${PORT}/admin.html`);
  console.log(` Student:  http://localhost:${PORT}/student.html\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nError: Port ${PORT} is already in use.`);
    console.error('Try:');
    console.error('  1. Kill the process using the port (netstat -ano | findstr :3000 → taskkill /PID <pid> /F)');
    console.error('  2. Or change PORT in code / use env var PORT=4000 node server.js');
    process.exit(1);
  } else {
    throw err;
  }
});