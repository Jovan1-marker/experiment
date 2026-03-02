# 🏥 MIMS — Medical Information Management System

A full-stack school clinic system built with **Node.js + Express + SQLite**.

---

## 📁 Folder Structure

```
mims/
├── server.js          ← Main Express server (all API routes)
├── database.js        ← SQLite setup + table creation + seeding
├── package.json       ← Project dependencies
├── mims.db            ← Auto-created SQLite database file
└── public/
    ├── index.html     ← Landing page (slideshow, about, services)
    ├── student.html   ← Student portal
    ├── admin.html     ← Admin portal
    ├── css/
    │   └── style.css  ← All styles for all three pages
    └── js/
        ├── index.js   ← Landing page JS (slideshow, login modal)
        ├── student.js ← Student portal JS
        └── admin.js   ← Admin portal JS
```

---

## 🚀 Setup Instructions

### Step 1 — Install Node.js
Download and install Node.js from: https://nodejs.org (choose LTS version)

### Step 2 — Open Terminal
Navigate into the project folder:
```bash
cd mims
```

### Step 3 — Install Dependencies
```bash
npm install
```
This installs: `express`, `better-sqlite3`, and `cors`.

### Step 4 — Start the Server
```bash
node server.js
```
You should see:
```
🏥 MIMS Server running!
   Local:   http://localhost:3000
```

### Step 5 — Open in Browser
- **Landing Page:** http://localhost:3000
- **Student Portal:** http://localhost:3000/student.html
- **Admin Portal:** http://localhost:3000/admin.html

---

## 🔑 Login Credentials (Demo)

| Role    | Username  | Password    |
|---------|-----------|-------------|
| Student | `student` | `student123` |
| Admin   | `admin`   | `admin123`  |

---

## 🗄️ Database

The SQLite database (`mims.db`) is **auto-created** on first run.
10 pre-seeded patients from **12 ICT – THALES** are inserted automatically.

---

## 🎨 Design System

| Color         | Usage                        | Value     |
|---------------|------------------------------|-----------|
| Dark Forest Green | Header, sidebar, buttons  | `#1B4332` |
| Light Mint Green  | Page backgrounds           | `#D8F3DC` |
| Gold/Yellow   | Active states, accents       | `#F4A820` |
| Font          | Poppins (Google Fonts)       |           |

---

## ✨ Features

### Landing Page
- Sticky navigation (Services, Announcements, Login)
- Auto-advancing image slideshow (8-second interval)
- About Clinic section with clinic info
- Clinic Services section (6 service cards)
- Announcements preview
- Login modal with Student/Admin tabs

### Student Portal
- **My Appointments** — Search by name to view appointment status
- **Request Appointment** — Form to submit to admin inbox
- **Announcements** — View clinic notices
- **Comment** — Submit anonymous feedback to admin

### Admin Portal
- **Patient** — Grid of patient cards with stats, search, add/edit/delete (up to 50)
- **Appointment** — Inbox with approve/reject buttons + pending badge
- **Waitlist** — Auto-populated with approved appointments
- **Record** — File manager UI to create/edit/delete medical note documents
- **Feedback** — List of student comments with delete option
