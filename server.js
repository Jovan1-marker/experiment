const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

const ADMIN_USER = { username: 'admin', password: 'admin123', role: 'admin' };

const requireAuth = (allowedRoles) => (req, res, next) => {
  const role = req.cookies.userRole;
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({ success: false, message: 'Unauthorized - please login' });
  }
  next();
};

app.post('/api/login', (req, res) => {
  const { username, password, role } = req.body || {};
  let user = null;
  if (role === 'admin') {
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
      user = ADMIN_USER;
    }
  } else if (role === 'student') {
    const student = db.prepare('SELECT * FROM student_accounts WHERE lrn = ? AND password = ?').get(username, password);
    if (student) {
      user = { username: student.lrn, role: 'student' };
    }
  }
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('userRole', user.role, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 3600 * 1000 });
  res.cookie('username', user.username, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 3600 * 1000 });
  res.json({ success: true, role: user.role, message: `Welcome, ${user.role}!` });
});

app.post('/api/student/signup', (req, res) => {
  const { lrn, password } = req.body;
  if (!lrn || lrn.length !== 12 || !/^\d{12}$/.test(lrn)) {
    return res.status(400).json({ success: false, message: 'LRN must be exactly 12 digits' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }
  const exists = db.prepare('SELECT 1 FROM student_accounts WHERE lrn = ?').get(lrn);
  if (exists) {
    return res.status(409).json({ success: false, message: 'This LRN is already registered' });
  }
  try {
    db.prepare('INSERT INTO student_accounts (lrn, password) VALUES (?, ?)').run(lrn, password);
    res.status(201).json({ success: true, message: 'Account created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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

app.get('/api/patients', requireAuth(['admin']), (req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY id ASC').all();
    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/patients', requireAuth(['admin']), (req, res) => {
  try {
    const { full_name, lrn, grade_section, height, weight, bmi_status, history, clinic_exposure, email, home_address, contact_no } = req.body;
    if (!full_name || !lrn) {
      return res.status(400).json({ success: false, message: 'full_name and lrn are required' });
    }
    const result = db.prepare(`
      INSERT INTO patients (full_name, lrn, grade_section, height, weight, bmi_status, history, clinic_exposure, email, home_address, contact_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(full_name, lrn, grade_section || null, height || null, weight || null, bmi_status || null, history || null, clinic_exposure || null, email || null, home_address || null, contact_no || null);
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/patients/:id', requireAuth(['admin']), (req, res) => {
  try {
    const { full_name, lrn, grade_section, height, weight, bmi_status, history, clinic_exposure, email, home_address, contact_no } = req.body;
    if (!full_name || !lrn) {
      return res.status(400).json({ success: false, message: 'full_name and lrn required' });
    }
    const info = db.prepare(`
      UPDATE patients SET full_name=?, lrn=?, grade_section=?, height=?, weight=?, bmi_status=?, history=?, clinic_exposure=?, email=?, home_address=?, contact_no=?
      WHERE id=?
    `).run(full_name, lrn, grade_section || null, height || null, weight || null, bmi_status || null, history || null, clinic_exposure || null, email || null, home_address || null, contact_no || null, req.params.id);
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

app.get('/api/appointments', requireAuth(['admin', 'student']), (req, res) => {
  try {
    const appointments = db.prepare('SELECT * FROM appointments ORDER BY created_at DESC').all();
    res.json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/appointments/waitlist', requireAuth(['admin']), (req, res) => {
  try {
    const waitlist = db.prepare("SELECT * FROM appointments WHERE status = 'Approved' ORDER BY created_at DESC").all();
    res.json({ success: true, data: waitlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/appointments', requireAuth(['student', 'admin']), (req, res) => {
  try {
    const { service_type, student_name, grade, lrn, description } = req.body;

    if (!service_type || !student_name || !lrn) {
      return res.status(400).json({ success: false, message: 'service_type, student_name, and lrn are required' });
    }

    const result = db.prepare(`
      INSERT INTO appointments (service_type, student_name, grade, lrn, description, status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `).run(
      service_type,
      student_name,
      grade || null,
      lrn,
      description || null
    );

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Appointment creation error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/feedback', requireAuth(['admin']), (req, res) => {
  try {
    const feedback = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all();
    res.json({ success: true, data: feedback });
  } catch (err) {
    console.error('Feedback load error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/feedback', requireAuth(['student', 'admin']), (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }
    const result = db.prepare('INSERT INTO feedback (message) VALUES (?)').run(message.trim());
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Feedback submission error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

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
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
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
      UPDATE records SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});