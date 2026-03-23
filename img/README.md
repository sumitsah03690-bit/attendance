# 📘 INTERNAL TEAM DOCUMENTATION
### Face Recognition Attendance System — NIT Warangal
> **For our team only** — This explains every part of our code in simple language. Use this when you want to understand, change, or debug anything.

---

## 🧠 First, What Does Our App Even Do?

Our app replaces manual roll-call with **AI-powered face recognition**. Here's the simple version:

1. **Admin** creates teacher accounts and adds subjects
2. **Teacher** registers students (captures their face 3 times with camera)
3. **Teacher** takes a group photo of the class → AI finds who's present
4. **Student** can log in and see their own attendance records
5. **Teacher** can download an Excel sheet with attendance data

The whole thing runs on **Vercel** (free hosting) and **MongoDB Atlas** (free cloud database). No server to maintain. Everything is JavaScript.

---

## 📁 Project Structure — What Each File Does

Think of our project like a house. Here's a room-by-room guide:

```
dt - Copy/
│
│── 🏠 THE PAGES (what users see)
│   ├── index.html          ← Login page — the front door of our app
│   ├── teacher.html        ← Teacher's workspace (register students, take attendance)
│   ├── student.html        ← Student's view (see their own attendance)
│   └── admin.html          ← Admin control panel (manage everything)
│
│── 🧠 THE BRAIN (logic that makes things work)
│   ├── app.js              ← ALL the JavaScript logic — this is the BIG file (~1370 lines)
│   │                          Everything from login to face recognition to Excel export
│   │                          is in this ONE file. Yes, it's long. But it's all here.
│   └── style.css           ← ALL the styling — colors, layout, animations, dark theme
│
│── 🔌 THE BACKEND (server-side code that talks to database)
│   ├── api/                ← Each file here becomes a URL endpoint on Vercel
│   │   ├── login.js            ← Handles login (checks email + password)
│   │   ├── register.js         ← Creates new student or teacher accounts
│   │   ├── users.js            ← Returns list of all users
│   │   ├── subjects.js         ← Add or list subjects (like "Data Structures")
│   │   ├── assign-course.js    ← Assign a subject to a teacher or student
│   │   ├── reset-password.js   ← Admin can reset anyone's password
│   │   ├── delete-user/
│   │   │   └── [id].js         ← Delete a user (the [id] means it takes a parameter)
│   │   ├── attendance/
│   │   │   ├── index.js        ← Save new attendance OR delete old attendance
│   │   │   ├── [email].js      ← Get a specific student's attendance records
│   │   │   └── teacher/
│   │   │       └── [email].js  ← Get ALL attendance for a teacher's subjects
│   │   └── face-data/
│   │       ├── index.js        ← Save or get face recognition data
│   │       └── [email].js      ← Check if a student has face data registered
│   │
│   └── lib/
│       └── db.js           ← Connects to MongoDB database (we'll explain below)
│
│── 📱 PWA STUFF (makes it installable on phones)
│   ├── manifest.json       ← Tells the browser our app's name, icons, colors
│   └── sw.js               ← Service Worker — caches files for offline use
│
│── 🖼️ IMAGES
│   └── img/
│       ├── logo.png        ← NITW logo shown on login page
│       ├── icon-192.png    ← Small app icon (for phone home screen)
│       └── icon-512.png    ← Large app icon (for splash screen)
│
│── ⚙️ CONFIG FILES
│   ├── .env                ← SECRET! Contains our MongoDB password/connection string
│   ├── .gitignore          ← Tells Git to IGNORE node_modules and .env (never push secrets!)
│   ├── package.json        ← Lists our npm dependencies (mongodb, bcryptjs)
│   ├── package-lock.json   ← Auto-generated exact version lock for dependencies
│   └── vercel.json         ← Tells Vercel how to route /api/* requests
│
└── 📦 node_modules/        ← Downloaded libraries (NEVER edit this folder, it's auto-generated)
```

### 💡 Key Insight
Our app is **NOT** a React/Next.js app. It's plain HTML + CSS + JavaScript. The `api/` folder uses **Vercel Serverless Functions** — each `.js` file in `api/` automatically becomes a URL endpoint when deployed.

---

## 🔑 How Login Works (Step by Step)

Let's trace what happens when someone clicks "Login":

### Step 1: User fills the form
On `index.html`, there are 3 fields: email, password, and a role dropdown (Student/Teacher/Admin).

### Step 2: JavaScript handles the form
When they click Submit, this function runs in `app.js`:
```js
// app.js — handleDemoLogin() (line ~131)
async function handleDemoLogin(e) {
    e.preventDefault();  // Stop the page from refreshing
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;
    
    // Send data to our server
    const data = await api.post('/api/login', { email, password, role });
    
    if (data.success) {
        // Save user info in browser's localStorage (stays even after refresh)
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        // Redirect to the right dashboard
        if (role === 'admin') window.location.href = 'admin.html';
        if (role === 'teacher') window.location.href = 'teacher.html';
        if (role === 'student') window.location.href = 'student.html';
    }
}
```

### Step 3: Server checks credentials
The `api/login.js` file receives the request:

- **If Admin**: Checks against hardcoded values — `admin@nitw.ac.in` / `admin123`
  - This means admin login does NOT go to the database at all
- **If Teacher/Student**: Looks up the email in the `users` collection in MongoDB, then uses `bcrypt.compare()` to check if the password matches the hashed version in the database

### Step 4: Dashboard loads
Each dashboard page (`teacher.html`, etc.) runs this check on load:
```js
// If the wrong role tries to access a page, kick them back to login
const user = JSON.parse(localStorage.getItem('currentUser'));
if (user.role !== 'teacher') window.location.href = 'index.html';
```

### 🔧 Want to change the admin credentials?
Edit `api/login.js`, line 17:
```js
if (email === 'admin@nitw.ac.in' && password === 'admin123')
//          ↑ change email here        ↑ change password here
```

---

## 🗄️ Database — Where All Data Lives

### What is MongoDB Atlas?
It's a **cloud database** — think of it as a Google Sheets in the cloud that our code can read/write to. We don't need to run any database server ourselves.

### How do we connect?
The connection string is in the `.env` file:
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/attendance_db
```
Our helper file `lib/db.js` uses this string to connect. It uses a **singleton pattern** — meaning it connects ONCE and reuses that connection (so we don't waste time reconnecting every API call).

### Our 4 Collections (like 4 tables/sheets)

#### 📋 Collection 1: `users` — All teachers and students

| Field | What It Stores | Example |
|-------|---------------|---------|
| `_id` | Auto ID (MongoDB creates this) | `ObjectId("abc123")` |
| `email` | Their email (**must be unique**) | `"john@nitw.ac.in"` |
| `password` | Hashed password (NOT plain text!) | `"$2a$10$xYz..."` |
| `role` | `"teacher"` or `"student"` | `"student"` |
| `name` | Full name | `"John Doe"` |
| `roll_number` | Roll number (students only) | `"CS21B001"` |
| `branch` | Branch (students only) | `"CSE"` |
| `year` | Year of study (students only) | `2` |
| `course` | Comma-separated subjects | `"Data Structures (CS201), OS (CS301)"` |
| `teacher_email` | Which teacher registered them | `"prof@nitw.ac.in"` |
| `created_at` | When account was created | `2026-03-20T10:30:00Z` |

**Important**: The `course` field stores subjects as a comma-separated string, NOT an array. So if a student is enrolled in 3 subjects, it looks like `"Sub1, Sub2, Sub3"`.

#### 📅 Collection 2: `attendance` — Every attendance entry

| Field | What It Stores | Example |
|-------|---------------|---------|
| `student_email` | Who was present | `"john@nitw.ac.in"` |
| `subject` | Which class | `"Data Structures (CS201)"` |
| `status` | Present or absent | `"present"` |
| `date` | Date string | `"2026-03-20"` |
| `time` | Time string | `"09:15:30"` |

**Note**: Each row = one student's attendance for one class on one day. If 50 students are present, that's 50 rows added. There's no "absent" row automatically — only students who are marked get entries.

#### 📚 Collection 3: `subjects` — All subjects in the system

| Field | What It Stores | Example |
|-------|---------------|---------|
| `name` | Subject name | `"Data Structures"` |
| `code` | Subject code (**must be unique**) | `"CS201"` |
| `year` | Which year this is for | `2` |
| `branches` | Which branches take this | `["CSE", "ECE"]` |
| `created_at` | When it was added | `2026-03-15T...` |

#### 🧬 Collection 4: `face_data` — Face recognition vectors

| Field | What It Stores | Example |
|-------|---------------|---------|
| `student_email` | Whose face (**must be unique**) | `"john@nitw.ac.in"` |
| `descriptors` | JSON string of face vectors | `"[[0.12, -0.34, ...], ...]"` |
| `descriptor` | Legacy single vector (backward compat) | `"[0.12, -0.34, ...]"` |
| `updated_at` | Last face update | `2026-03-20T...` |

**What's a "descriptor"?** When face-api.js analyzes a face, it creates a list of 128 numbers that uniquely represent that face. These numbers capture things like distance between eyes, nose shape, etc. Two photos of the same person will have similar numbers. We store these numbers to match faces later.

### 🔧 How to look at the database directly

**Option 1**: Use [MongoDB Compass](https://www.mongodb.com/products/compass) (free GUI app)
- Download and install it
- Paste the connection string from `.env`
- You can browse, search, edit, and delete data visually

**Option 2**: Use the `mongosh` command-line tool
```bash
# Connect (copy the URI from .env file)
mongosh "mongodb+srv://dbuser09800:password@cluster0.krv5gwf.mongodb.net/attendance_db"

# Useful commands:
show collections                              # See all 4 collections
db.users.find({ role: "student" }).pretty()  # See all students
db.users.find({ role: "teacher" }).pretty()  # See all teachers
db.attendance.find({ date: "2026-03-20" })   # See attendance for a date
db.face_data.find({})                        # See all face data entries
db.users.countDocuments({ role: "student" }) # Count total students
db.attendance.deleteMany({})                 # ⚠️ DELETE all attendance (careful!)
```

---

## 🤖 Face Recognition — How The AI Part Works

### What library do we use?
**face-api.js** — It's a JavaScript library built on top of TensorFlow.js. It runs **entirely in the browser** (client-side), meaning no face images are ever sent to our server. Privacy-friendly!

### Where are the AI models loaded from?
```js
// app.js line ~152
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';
```
Models are loaded from a CDN (Content Delivery Network) the first time a teacher opens their dashboard. Three models are loaded:
1. **SSD MobileNet v1** — Finds where faces are in an image (face detection)
2. **Face Landmark 68 Net** — Maps 68 points on each face (eyes, nose, mouth, jawline)
3. **Face Recognition Net** — Converts each face into a 128-number "fingerprint" (descriptor)

### Registration: How we save a student's face

```
STEP 1: Teacher clicks "Start Camera"
   └── openCamera() → asks browser for camera permission → shows video feed

STEP 2: Teacher clicks "Capture" (3 times, student tilts head slightly each time)
   └── Each click → extractDescriptor(videoElement) 
       └── face-api detects the face → returns 128 numbers [0.12, -0.34, 0.56, ...]
       └── Stored in capturedFaceDescriptors[] array

STEP 3: After 3 captures, we AVERAGE them
   └── averageDescriptors([capture1, capture2, capture3])
       └── For each of the 128 positions, take the average of all 3 values
       └── This gives us ONE robust descriptor that handles slight face variations

STEP 4: Save to database
   └── POST /api/face-data with all 4 descriptors (3 individual + 1 averaged)
   └── Stored as JSON string in MongoDB face_data collection
```

**Why 3 captures?** A single photo from one angle might not be enough. If the student slightly turns or the lighting changes during attendance, the match could fail. By averaging 3 slightly different angles, we get a much more robust "face fingerprint."

### Attendance: How we recognize faces in a group photo

```
STEP 1: Teacher selects subject, opens camera, takes group photo
   └── captureGroupPhoto() → draws video frame to a canvas element

STEP 2: Detect ALL faces in the photo
   └── faceapi.detectAllFaces(canvas) → finds every face in the image
   └── For each face, extracts its 128-number descriptor

STEP 3: Load all registered faces from database
   └── GET /api/face-data → returns all students' stored descriptors

STEP 4: Match each detected face against database
   └── faceapi.FaceMatcher(allStoredFaces, threshold=0.55)
   └── For each face in the photo:
       └── Compare its 128 numbers against every student's stored 128 numbers
       └── "Distance" = how different they are (lower = more similar)
       └── If distance < 0.55 → MATCH! We know who this is
       └── If distance > 0.55 → "unknown" (no match found)

STEP 5: Filter results
   └── Only show students who are enrolled in the selected subject
   └── Apply year filter if set

STEP 6: Teacher confirms → Save to database
   └── POST /api/attendance with bulk records
```

### 🔧 Common Tuning Parameters

| What | Where | Current | What It Does |
|------|-------|---------|-------------|
| **Match Threshold** | `app.js` line 749 | `0.55` | How similar faces must be to match. **Lower = stricter** (fewer false matches but might miss people). **Higher = more lenient** (catches more people but might mix them up). Try `0.45` if getting wrong matches, `0.60` if missing people. |
| **Number of Captures** | `app.js` line 287 | `3` | How many times to photograph during registration. More = better accuracy but slower registration. |
| **Min Confidence** | `app.js` (search `minConfidence`) | `0.3` | How confident the AI must be that something IS a face before processing it. Lower = detects blurry/small faces. Higher = only clear faces. |
| **Max Descriptors Stored** | `api/face-data/index.js` line 43 | `5` | Max face samples stored per student in append mode. |

---

## 📊 Excel Export — How Reports Are Generated

### What library do we use?
**SheetJS (xlsx)** — A JavaScript library that creates `.xlsx` Excel files right in the browser. It's loaded via CDN in `teacher.html`.

### Two types of Excel exports

#### Type 1: Quick Export (happens automatically after taking attendance)
When a teacher takes attendance and saves, the function `saveRecognizedAttendance()` creates a small Excel file with just the students who were marked present today.

**Where in code**: `app.js` → `saveRecognizedAttendance()` (line ~878)

#### Type 2: Full Report (teacher clicks "Download Report" button)
The function `downloadTeacherReport()` fetches ALL attendance data and creates a proper report.

**Where in code**: `app.js` → `downloadTeacherReport()` (line ~3)

This creates an Excel file with **2 sheets**:

**Sheet 1: "Detailed"** — Every single attendance entry as a row
```
| Student Name | Roll Number | Email         | Subject     | Status | Date       | Time     |
|-------------|-------------|---------------|-------------|--------|------------|----------|
| John Doe    | CS21B001    | john@nitw.ac.in| DS (CS201) | 1      | 2026-03-20 | 09:15:30 |
| Jane Smith  | CS21B002    | jane@nitw.ac.in| DS (CS201) | 1      | 2026-03-20 | 09:15:30 |
```

**Sheet 2: "Register"** — Matrix format (like a real attendance register)
```
| Student Name | 2026-03-18 | 2026-03-20 | 2026-03-22 |
|-------------|------------|------------|------------|
| John Doe    | 1          | 1          | 0          |
| Jane Smith  | 1          | 0          | 1          |
| TOTAL       | 2          | 1          | 1          |
```
- `1` = present, `0` = absent
- Dates are sorted chronologically
- Students are sorted by roll number
- Last row shows total present per date

### 🔧 How the register data is built (simplified code walkthrough)

```js
// Step 1: Group attendance by student
const studentMap = {};  // { "john@nitw.ac.in": { name: "John", dates: { "2026-03-20": 1 } } }

data.forEach(record => {
    // For each attendance record, add it to the student's entry
    studentMap[record.email].dates[record.date] = 1;  // mark present
});

// Step 2: Build the rows
sortedStudents.forEach(student => {
    const row = { 'Student Name': student.name };
    
    // For each date, check if student was present
    allDates.forEach(date => {
        row[date] = student.dates[date] ? 1 : 0;
    });
    
    registerRows.push(row);
});

// Step 3: Add TOTAL row
const totalRow = { 'Student Name': 'TOTAL' };
allDates.forEach(date => {
    totalRow[date] = registerRows.reduce((sum, row) => sum + row[date], 0);
});
```

### 🔧 Want to add more columns to the register (like Roll Number, Percentage)?
Edit `app.js` in the `downloadTeacherReport()` function (around line 59):
```js
// Add Roll Number back:
const row = { 'Student Name': student.name, 'Roll': student.roll };

// Add percentage after the dates:
row['Percentage'] = ((totalPresent / totalClasses) * 100).toFixed(1) + '%';
```

---

## 🌐 API Endpoints — How Frontend Talks to Backend

### What is a "Serverless Function"?
Normally you'd need to run a server (like Express.js) to handle API calls. With **Vercel Serverless Functions**, each file in the `api/` folder automatically becomes a URL. No server management needed!

Example: The file `api/login.js` automatically becomes the URL `https://your-app.vercel.app/api/login`

### How does `api.post()` / `api.get()` work?
In `app.js` (line ~120), we have a simple helper:
```js
const api = {
    get: (url) => fetch(url).then(r => r.json()),
    // ↑ Makes a GET request and parses the JSON response
    
    post: (url, data) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    // ↑ Makes a POST request with JSON data
    
    del: (url) => fetch(url, { method: 'DELETE' }).then(r => r.json())
    // ↑ Makes a DELETE request
};
```
This is just a wrapper around the browser's built-in `fetch()` function.

### Complete API Reference

| Method | URL | What It Does | Request Body | Response |
|--------|-----|-------------|-------------|----------|
| `POST` | `/api/login` | Check credentials, return user info | `{ email, password, role }` | `{ success, user: { email, name, role, ... } }` |
| `POST` | `/api/register` | Create student (if rollNumber given) or teacher | `{ name, email, password, rollNumber?, course?, branch?, year?, teacher_email? }` | `{ success, message }` |
| `GET` | `/api/users` | Get all users (passwords excluded) | — | `{ success, users: [...] }` |
| `DELETE` | `/api/delete-user/:id` | Delete user by MongoDB ID | — | `{ success, message }` |
| `POST` | `/api/reset-password` | Change a user's password | `{ user_id, new_password }` | `{ success, message }` |
| `GET` | `/api/subjects` | List all subjects | — | `{ success, subjects: [...] }` |
| `POST` | `/api/subjects` | Add a new subject | `{ name, code, year, branches? }` | `{ success, message }` |
| `POST` | `/api/assign-course` | Assign subject to a user | `{ email, new_course }` | `{ success, message }` |
| `POST` | `/api/attendance` | Save attendance (supports bulk) | `{ records: [{ email, status }], subject }` | `{ success, message }` |
| `DELETE` | `/api/attendance?subject=X&date=Y` | Clear attendance records | Query params | `{ success, deleted_count }` |
| `GET` | `/api/attendance/:email` | Get a student's attendance | — | `{ success, attendance: [...] }` |
| `GET` | `/api/attendance/teacher/:email` | Get all attendance for teacher's subjects | — | `{ success, attendance: [...] }` |
| `GET` | `/api/face-data` | Get all stored face descriptors | — | `{ success, face_data: [...] }` |
| `POST` | `/api/face-data` | Save face descriptor(s) | `{ student_email, descriptors, replace? }` | `{ success, message }` |
| `GET` | `/api/face-data/:email` | Check if student has face data | — | `{ success, has_face }` |

### 🔧 Want to add a new API endpoint?
1. Create a new `.js` file in `api/` folder
2. Export a default async function:
```js
const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
    // req.method tells you GET/POST/DELETE
    // req.body has POST data
    // req.query has URL parameters
    
    const db = await getDb();
    // Use db.collection('users').find(), .insertOne(), .updateOne(), .deleteOne() etc.
    
    return res.json({ success: true, message: 'It worked!' });
};
```
3. Deploy to Vercel → it automatically becomes a URL!

### ⚠️ Important: No Server-Side Authentication!
Our API endpoints don't verify who's calling them. Anyone who knows the URL can call them. Security currently relies on:
- Frontend role checks (redirecting wrong roles to login)
- `localStorage` storing the logged-in user

**For a real production app**, you'd add JWT tokens or session cookies. But for our college project, this is fine.

---

## 🎨 How Styling Works

### Everything is in `style.css`
We use **CSS Custom Properties** (variables) for our theme. This means changing one variable changes the entire app's color scheme.

### The color variables (top of `style.css`)
```css
:root {
    --primary: #6366f1;        /* Indigo — used for buttons, links, active tabs */
    --success: #22c55e;        /* Green — "present" badges, success messages */
    --danger: #ef4444;         /* Red — "absent" badges, error messages, delete buttons */
    --warning: #f59e0b;        /* Amber — loading states, "near target" */
    --bg-primary: #0f172a;     /* Dark navy — main page background */
    --bg-card: #1e293b;        /* Slightly lighter — card backgrounds */
    --text-primary: #f1f5f9;   /* Almost white — headings, important text */
    --text-secondary: #94a3b8; /* Muted gray — secondary text, descriptions */
    --border: rgba(255,255,255,0.08); /* Very subtle — card borders, dividers */
}
```

### 🔧 Want to change the theme?
Just edit these variables! For example, to make the app blue instead of indigo:
```css
--primary: #3b82f6;  /* Change from indigo to blue */
```
Every button, link, and accent in the entire app will update automatically.

### 🔧 Want a light theme?
Swap the background and text colors:
```css
--bg-primary: #ffffff;
--bg-card: #f8fafc;
--text-primary: #0f172a;
--text-secondary: #64748b;
--border: rgba(0,0,0,0.1);
```

---

## 📱 PWA — Making It Work Like a Phone App

### What is a PWA?
A **Progressive Web App** makes your website installable on phones. Users tap "Add to Home Screen" and it appears like a regular app — with its own icon, splash screen, and full-screen mode.

### Our PWA files

**`manifest.json`** — Tells the browser about our app:
```json
{
    "name": "Face Attendance - NITW",     // Full name
    "short_name": "Attendance",           // Name under the icon
    "start_url": "/index.html",           // Which page opens when tapped
    "display": "standalone",              // Hides browser's URL bar
    "background_color": "#0f172a",        // Splash screen background
    "theme_color": "#6366f1",             // Status bar color
    "icons": [...]                        // App icons
}
```

**`sw.js`** — Service Worker that caches files:
```js
// Caches our HTML, CSS, JS files so the app loads even without internet
// To update cache: change the CACHE_NAME in sw.js
```

---

## 🚀 Deployment — How to Put It Online

### Vercel (what we use)

```bash
# First time setup:
npm install -g vercel    # Install Vercel CLI globally
vercel login             # Login with your Vercel account (use GitHub)

# Deploy:
vercel --prod            # Deploys to production URL

# Set the database connection (first time only):
vercel env add MONGODB_URI
# Then paste your MongoDB connection string when prompted
```

### Running Locally (for development)
You can't fully run it locally because the `api/` functions need Vercel's runtime. But you can use:
```bash
npm install              # Install dependencies first
npx vercel dev           # Runs a local development server with API support
# App will be at http://localhost:3000
```

### ⚠️ Never push `.env` to GitHub!
The `.gitignore` file already prevents this, but double-check. The `.env` file contains your database password.

---

## 🔄 How the App Initializes (What Happens on Page Load)

When any page loads, this runs (bottom of `app.js`):

```js
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    
    fetchSubjects();  // Always load subjects into dropdowns
    
    if (!user) return;  // Not logged in? Stop here.
    
    // Check which page we're on and initialize accordingly
    if (path.includes('admin.html'))   → initAdminDashboard()   → fetchAdminUsers()
    if (path.includes('teacher.html')) → initTeacherDashboard() → loadFaceModels(), fetchStudents()
    if (path.includes('student.html')) → initStudentDashboard() → fetch attendance records
    
    // Also: refresh user data from server in case anything changed
});
```

---

## 🔧 Common Changes — Quick Copy-Paste Guide

### Add a new field to student registration
1. Add input field in `teacher.html` (inside the registration form)
2. In `app.js` → `handleRegisterStudent()` (line ~504), grab the value:
   ```js
   d.newfield = document.getElementById('newFieldInput').value;
   ```
3. In `api/register.js`, add it to the `insertOne()` call (line ~25):
   ```js
   newfield: req.body.newfield || '',
   ```

### Add a new page/dashboard
1. Create `newpage.html` with your HTML
2. Link `style.css` and `app.js` in the `<head>` and `<body>`
3. In `app.js` → `DOMContentLoaded` handler (line ~1317), add:
   ```js
   if (path.includes('newpage.html')) {
       initNewPageDashboard(user);
   }
   ```
4. Write the `initNewPageDashboard()` function

### Change what data the Excel report contains
Edit `app.js` → `downloadTeacherReport()` function (starts at line ~3):
- **Detailed sheet data**: Line ~24 (`detailedRows`)
- **Register sheet data**: Line ~59 (`registerRows`)

---

## 🐛 Troubleshooting Guide

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| "Camera access denied" | Browser blocked camera | Use HTTPS (or localhost). Check browser permissions settings. |
| "No faces detected" | Image too dark/blurry, or confidence too high | Lower `minConfidence` from `0.3` to `0.2` in `app.js` |
| Wrong student recognized | Faces too similar, threshold too high | Lower threshold from `0.55` to `0.45` in `app.js` line 749 |
| "AI models failed to load" | CDN blocked or slow internet | Check console for network errors. Try refreshing. |
| "Excel library not loaded" | SheetJS CDN not loading | Check if `teacher.html` has the SheetJS `<script>` tag |
| API returns 500 error | Database issue or code bug | Check Vercel logs: `vercel logs --follow` in terminal |
| "MongoDB connection failed" | Wrong URI or IP not whitelisted | Go to MongoDB Atlas → Network Access → Add `0.0.0.0/0` to allow all IPs |
| Login fails but credentials are correct | Wrong role selected in dropdown | Make sure to select the matching role (Student/Teacher/Admin) |
| Student not showing in attendance | Not enrolled in that subject | Check student's `course` field — must contain the exact subject name |
| "Email already exists" on registration | Duplicate email in database | Each email must be unique. Use a different email or delete the old account. |
| PWA not showing latest changes | Old cache | Change `CACHE_NAME` in `sw.js`, or clear browser cache/service worker |
| Deployed but API doesn't work | `.env` not set on Vercel | Run `vercel env add MONGODB_URI` and paste your connection string |

---

## 📖 Glossary — Terms We Use

| Term | What It Means |
|------|--------------|
| **API** | Application Programming Interface — the URLs our frontend calls to talk to the database |
| **Serverless Function** | A small backend function that runs on-demand (no server to maintain). Each `.js` file in `api/` is one. |
| **MongoDB** | A NoSQL database — stores data as JSON-like "documents" instead of rows/columns like SQL |
| **Collection** | MongoDB's version of a table. We have 4: `users`, `attendance`, `subjects`, `face_data` |
| **Document** | MongoDB's version of a row. One user = one document. |
| **bcrypt** | A library for securely hashing passwords. Converts `"password123"` → `"$2a$10$xYz..."` |
| **Face Descriptor** | A list of 128 numbers that mathematically represent a face. Used for matching. |
| **Threshold** | The maximum "distance" between two face descriptors to consider them a match (0.55 = moderate) |
| **CDN** | Content Delivery Network — servers that host files (like our AI models) for fast loading worldwide |
| **PWA** | Progressive Web App — makes a website installable and (partially) work offline |
| **Service Worker** | A script that runs in the background, caching files for offline use |
| **localStorage** | Browser storage that persists across page refreshes. We store the logged-in user here. |
| **CRUD** | Create, Read, Update, Delete — the 4 basic database operations |
| **Upsert** | "Update if exists, Insert if doesn't" — used when saving face data |
| **Singleton** | A design pattern where only one instance of something exists (our DB connection) |
| **Vercel** | A cloud platform for hosting websites and serverless functions (free tier available) |

---

## 📂 Full app.js Function Map

Since `app.js` is our biggest file (~1370 lines), here's a map of every major function and what it does:

| Function | Line | What It Does |
|----------|------|-------------|
| `downloadTeacherReport()` | ~3 | Fetches all attendance → builds Detailed + Register sheets → downloads Excel |
| `initTeacherReportUI()` | ~99 | Populates the subject filter dropdown on teacher page |
| `showNotification()` | ~108 | Shows a toast notification (green = success, red = error) |
| `api.get/post/del()` | ~120 | Helper functions for making HTTP requests |
| `handleDemoLogin()` | ~131 | Handles the login form submission |
| `loadFaceModels()` | ~154 | Downloads AI models from CDN (runs once) |
| `extractDescriptor()` | ~183 | Gets 128-number face vector from a single face |
| `averageDescriptors()` | ~197 | Averages multiple face vectors into one |
| `extractAllDescriptors()` | ~207 | Gets face vectors for ALL faces in an image |
| `openCamera()` | ~222 | Opens phone/laptop camera with specified direction |
| `flipCamera()` | ~246 | Switches between front and back camera |
| `closeCamera()` | ~271 | Stops camera stream |
| `startFaceCapture()` | ~289 | Begins the face registration camera session |
| `captureFace()` | ~309 | Captures one face sample during registration |
| `stopFaceCapture()` | ~355 | Cancels face registration |
| `handleRegisterStudent()` | ~504 | Submits the student registration form (teacher side) |
| `handleAdminRegisterStudent()` | ~544 | Submits student registration (admin side) |
| `startAttendanceCamera()` | ~593 | Opens camera for group attendance |
| `captureGroupPhoto()` | ~615 | Takes one snapshot during attendance |
| `finishCameraCaptures()` | ~646 | Closes camera and processes all captured faces |
| `recognizeFacesFromElement()` | ~732 | Core: detects + matches faces against database |
| `displayAccumulatedResults()` | ~800+ | Shows the recognized students list with checkboxes |
| `saveRecognizedAttendance()` | ~878 | Saves checked students to database + generates Excel |
| `generateExcel()` | ~913 | Creates and downloads an Excel file (SheetJS) |
| `fetchTeacherStudents()` | ~990 | Gets list of teacher's registered students |
| `handleAdminAddSubject()` | ~1043 | Adds a new subject (admin) |
| `handleAdminRegisterTeacher()` | ~1059 | Creates a teacher account (admin) |
| `handleClearAttendance()` | ~1079 | Deletes attendance records with filters |
| `fetchSubjects()` | ~1146 | Loads all subjects from database |
| `populateSubjectDropdowns()` | ~1153 | Fills all subject `<select>` elements |
| `fetchAdminUsers()` | ~1176 | Loads all users for admin dashboard |
| `renderAdminUsers()` | ~1208 | Renders the admin users table |
| `initStudentDashboard()` | ~1237 | Sets up the student page (loads their attendance) |
| `DOMContentLoaded` handler | ~1318 | Entry point: decides which dashboard to initialize |

---

*Last updated: March 2026*
*Written for first-year team members — ask questions if anything is unclear! 🙌*
