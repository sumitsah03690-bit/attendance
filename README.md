<div align="center">

# 🎯 FaceAttend AI

### Intelligent Face Recognition Attendance System

**Built for NIT Warangal** · Powered by AI · Zero Manual Entry

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)

<br>

<img src="img/logo.png" alt="NITW Logo" width="100">

*Automating classroom attendance with real-time face recognition — one photo, every student marked.*

</div>

---

## 🔥 Slide 1 — The Problem

<table>
<tr>
<td width="50%">

### 📋 Manual Attendance is Broken

- **15–20 minutes wasted** every class on roll calls
- Proxy attendance is **rampant** — students sign for absent friends
- Paper registers get **lost or damaged**
- Teachers managing **80+ students** can't track everyone
- End-of-semester reports require **hours of manual compilation**

</td>
<td width="50%">

### 📊 The Numbers

| Metric | Impact |
|--------|--------|
| ⏱️ Time wasted per class | ~15 min |
| 📅 Classes per semester | ~120 |
| 🕐 Total hours lost | **30 hours/teacher** |
| 🎭 Proxy rate (estimated) | ~20% |
| 📉 Data accuracy | Error-prone |

</td>
</tr>
</table>

---

## 💡 Slide 2 — Our Solution

<div align="center">

### One Photo. Every Student. Instant Attendance.

```
📷 Teacher takes a group photo  →  🤖 AI detects all faces  →  ✅ Attendance auto-marked
```

**FaceAttend AI** uses browser-based face recognition to identify every student in a single group photo — no apps to install, no hardware needed, works on any phone or laptop.

</div>

---

## ⚙️ Slide 3 — How It Works

```mermaid
graph LR
    A[📷 Capture Photo] --> B[🧠 AI Face Detection]
    B --> C[🔍 Match Against Database]
    C --> D[✅ Mark Present]
    D --> E[📊 Generate Reports]
    
    style A fill:#6366f1,stroke:#4f46e5,color:#fff
    style B fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style C fill:#a78bfa,stroke:#8b5cf6,color:#fff
    style D fill:#22c55e,stroke:#16a34a,color:#fff
    style E fill:#f59e0b,stroke:#d97706,color:#fff
```

| Step | What Happens | Time |
|------|-------------|------|
| 1️⃣ | Teacher opens camera or uploads group photo | 2 sec |
| 2️⃣ | AI detects every face in the frame (handles 80+ students) | 3-5 sec |
| 3️⃣ | Each face matched against registered student database | 1-2 sec |
| 4️⃣ | Results displayed — teacher confirms or edits | 5 sec |
| 5️⃣ | Attendance saved + Excel report auto-generated | Instant |

> **Total time: Under 15 seconds** vs. 15+ minutes manual roll call

---

## 🏗️ Slide 4 — Architecture

```
┌──────────────────────────────────────────────────┐
│                   FRONTEND                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Login   │ │ Teacher  │ │  Student / Admin  │  │
│  │  Page    │ │Dashboard │ │   Dashboards      │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
│         HTML + CSS + Vanilla JavaScript           │
│         face-api.js (AI) · SheetJS (Excel)        │
├──────────────────────────────────────────────────┤
│              VERCEL SERVERLESS API                 │
│  /api/login · /api/register · /api/attendance     │
│  /api/face-data · /api/subjects · /api/users      │
├──────────────────────────────────────────────────┤
│              MONGODB ATLAS (Cloud)                 │
│  users · attendance · face_data · subjects        │
└──────────────────────────────────────────────────┘
```

---

## 👥 Slide 5 — Three Dashboards, Three Roles

<table>
<tr>
<td align="center" width="33%">

### 🛡️ Admin
- Register teachers & students
- Manage subjects & courses
- Clear attendance records
- Reset passwords
- View all users

</td>
<td align="center" width="33%">

### 👨‍🏫 Teacher
- Register students with face capture
- Take attendance via camera/photo
- Filter by year & subject
- Download Excel reports
- View enrolled students

</td>
<td align="center" width="33%">

### 🎓 Student
- View personal attendance
- See subject-wise breakdown
- Track attendance percentage
- Check target status (75%)
- View recent records

</td>
</tr>
</table>

---

## 🧠 Slide 6 — AI Face Recognition Engine

<table>
<tr>
<td width="60%">

### Multi-Sample Registration
Each student's face is captured **3 times** at slightly different angles, then averaged into a robust 128-dimensional face descriptor. This dramatically improves recognition accuracy.

### Real-Time Matching
- **Model**: SSD MobileNet v1 (lightweight, fast)
- **Threshold**: 0.55 Euclidean distance
- **Runs entirely in-browser** — no data sent to external servers
- Supports **front & back camera** with flip toggle

### Group Detection
A single photo can identify **80+ students simultaneously** — the AI detects every face and matches against the registration database.

</td>
<td width="40%">

```
Registration:
  📸 Capture 1 → [128-dim vector]
  📸 Capture 2 → [128-dim vector]  
  📸 Capture 3 → [128-dim vector]
       ↓ Average
  🧬 Final Descriptor [128-dim]
       ↓ Store
  💾 MongoDB face_data

Recognition:
  📷 Group Photo
       ↓ Detect
  👤👤👤 N faces found
       ↓ Match each
  ✅ John (0.32)
  ✅ Jane (0.41)
  ❌ Unknown (0.68)
```

</td>
</tr>
</table>

---

## 📊 Slide 7 — Smart Excel Reports

### Register-Style Attendance Matrix

The system generates professional Excel reports with **two sheets**:

**Sheet 1 — Detailed Log**
| Student Name | Roll Number | Email | Subject | Status | Date | Time |
|---|---|---|---|---|---|---|
| John Doe | CS21001 | john@nitw.ac.in | DS (CS201) | 1 | 2026-03-20 | 09:15:30 |

**Sheet 2 — Attendance Register**
| Student Name | 2026-03-18 | 2026-03-20 | 2026-03-22 |
|---|---|---|---|
| John Doe | 1 | 1 | 0 |
| Jane Smith | 1 | 0 | 1 |
| **TOTAL** | **2** | **1** | **1** |

> ✨ Auto-formatted headers, auto-width columns, bold summary rows — ready to print or submit.

---

## 📱 Slide 8 — Works Everywhere (PWA)

<div align="center">

### Install Once. Works Offline. No App Store Needed.

</div>

| Feature | Details |
|---------|---------|
| 📲 **Installable** | Add to home screen on any phone/tablet |
| 🌐 **No Downloads** | Works in browser — Chrome, Safari, Edge, Firefox |
| 🔒 **Secure** | HTTPS enforced, camera permissions required |
| 📷 **Camera Access** | Front & back camera with live flip |
| 📤 **Photo Upload** | Upload pre-taken photos for offline scenarios |
| ⚡ **Lightweight** | Under 100KB total frontend code |

---

## 🛡️ Slide 9 — Security & Privacy

| Concern | How We Handle It |
|---------|-----------------|
| 🔐 **Passwords** | Hashed with bcrypt (10 salt rounds) — never stored in plain text |
| 🧬 **Face Data** | Stored as mathematical descriptors only — cannot be reversed to photos |
| 🌐 **Processing** | All face recognition happens **client-side** — no images sent to any server |
| 👤 **Role Guards** | Each dashboard verifies user role before rendering |
| 🗄️ **Database** | MongoDB Atlas with TLS encryption, IP whitelisting |
| 🔑 **Admin** | Hardcoded credentials, separate from database |

---

## 🚀 Slide 10 — Get Started

### Quick Deploy

```bash
# 1. Clone the repository
git clone https://github.com/your-org/faceattend-ai.git
cd faceattend-ai

# 2. Install dependencies
npm install

# 3. Set up environment
echo "MONGODB_URI=your_mongodb_connection_string" > .env

# 4. Deploy to Vercel
npx vercel --prod
```

### Default Login

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@nitw.ac.in` | `admin123` |
| Teacher | *Created by Admin* | *Set during registration* |
| Student | *Created by Teacher/Admin* | *Set during registration* |

---

## 🧰 Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5 · CSS3 · Vanilla JavaScript |
| **AI Engine** | face-api.js (TensorFlow.js based) |
| **Excel** | SheetJS (xlsx) |
| **Backend** | Vercel Serverless Functions (Node.js) |
| **Database** | MongoDB Atlas |
| **Auth** | bcryptjs |
| **Hosting** | Vercel (CDN + Edge Network) |
| **PWA** | Service Worker + Web App Manifest |

</div>

---

<div align="center">

### Built with ❤️ at NIT Warangal

**FaceAttend AI** — Because attendance should take seconds, not semesters.

<br>

[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](#)
[![face-api.js](https://img.shields.io/badge/AI-face--api.js-blue?style=flat-square)](#)
[![MongoDB](https://img.shields.io/badge/DB-MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](#)
[![Vercel](https://img.shields.io/badge/Hosted-Vercel-black?style=flat-square&logo=vercel)](#)

</div>
