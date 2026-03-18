
// ═══ Attendance Reports ═══
async function downloadTeacherReport() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.role !== 'teacher') return;

    const filterSubject = document.getElementById('reportSubjectFilter').value;
    showNotification('Fetching attendance records...');

    try {
        const resp = await api.get(`/api/attendance/teacher/${user.email}`);
        if (!resp.success) throw new Error(resp.error);

        let data = resp.attendance;
        if (filterSubject !== 'all') {
            data = data.filter(r => r.subject === filterSubject);
        }

        if (data.length === 0) {
            return showNotification('No attendance records found for the selected filter.', true);
        }

        // Format for Excel
        const excelRows = data.map(r => ({
            'Student Name': r.student_name || 'N/A',
            'Roll Number': r.roll || 'N/A',
            'Email': r.student_email,
            'Subject': r.subject,
            'Status': r.status.toUpperCase(),
            'Date': r.date,
            'Time': r.time
        }));

        const filename = `Attendance_Report_${filterSubject === 'all' ? 'All_Subjects' : filterSubject.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        generateExcel(excelRows, filename);
        showNotification('Report downloaded successfully!');

    } catch (err) {
        console.error('Report fetch failed:', err);
        showNotification('Failed to generate report.', true);
    }
}

function initTeacherReportUI(user) {
    const reportFilter = document.getElementById('reportSubjectFilter');
    if (!reportFilter) return;

    const subjects = user.course ? user.course.split(',').map(s => s.trim()) : [];
    reportFilter.innerHTML = '<option value="all">All Assigned Subjects</option>' +
        subjects.map(s => `<option value="${s}">${s}</option>`).join('');
}

function showNotification(msg, isError = false) {
    const el = document.createElement('div');
    el.className = `notification show ${isError ? 'error' : 'success'}`;
    el.style.display = 'block';
    el.innerText = msg;
    document.body.appendChild(el);
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

const api = {
    get: (url) => fetch(url).then(r => r.json()),
    post: (url, data) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()),
    del: (url) => fetch(url, { method: 'DELETE' }).then(r => r.json())
};

// ── Auth Handlers ──────────────────────────────────────────────
async function handleDemoLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;

    try {
        const data = await api.post('/api/login', { email, password, role });
        if (data.success) {
            showNotification(data.message);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            const dest = role === 'admin' ? 'admin.html' : role === 'teacher' ? 'teacher.html' : 'student.html';
            setTimeout(() => window.location.href = dest, 1000);
        } else showNotification(data.message, true);
    } catch (err) { showNotification('Server error.', true); }
}

// Public registration removed. Registration is now Admin-only.

// ── Face API Models ─────────────────────────────────────────────
let modelsLoaded = false;
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';

async function loadFaceModels() {
    if (modelsLoaded) return true;
    const statusEl = document.getElementById('aiStatusText');
    const btn = document.getElementById('loadModelsBtn');
    if (statusEl) statusEl.textContent = 'Loading...';
    if (btn) btn.disabled = true;

    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoaded = true;
        if (statusEl) statusEl.textContent = 'Ready ✅';
        if (statusEl) statusEl.style.color = 'var(--success)';
        if (btn) btn.style.display = 'none';
        showNotification('AI Face Recognition engine loaded!');
        return true;
    } catch (err) {
        console.error('Model load error:', err);
        if (statusEl) statusEl.textContent = 'Failed ❌';
        if (btn) btn.disabled = false;
        showNotification('Failed to load AI models.', true);
        return false;
    }
}

// ── Face Descriptor Extraction ──────────────────────────────────
async function extractDescriptor(inputElement) {
    if (!modelsLoaded) {
        const loaded = await loadFaceModels();
        if (!loaded) return null;
    }
    const detection = await faceapi
        .detectSingleFace(inputElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
    if (!detection) return null;
    return Array.from(detection.descriptor);
}

async function extractAllDescriptors(inputElement) {
    if (!modelsLoaded) {
        const loaded = await loadFaceModels();
        if (!loaded) return [];
    }
    const detections = await faceapi
        .detectAllFaces(inputElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();
    return detections;
}

// ── Camera Helpers ──────────────────────────────────────────────
let currentStream = null;

async function openCamera(videoId) {
    const video = document.getElementById(videoId);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        video.srcObject = stream;
        video.style.display = 'block';
        currentStream = stream;
        return true;
    } catch (err) {
        showNotification('Camera access denied.', true);
        return false;
    }
}

function closeCamera(videoId) {
    const video = document.getElementById(videoId);
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
        video.srcObject = null;
        video.style.display = 'none';
    }
    currentStream = null;
}

// ══════════════════════════════════════════════════════════════════
// TEACHER DASHBOARD — FACE REGISTRATION DURING STUDENT ENROLLMENT
// ══════════════════════════════════════════════════════════════════

let capturedFaceDescriptor = null; // Holds descriptor for student being registered

async function startFaceCapture() {
    const ok = await openCamera('regStudentVideo');
    if (ok) {
        document.getElementById('startFaceCamBtn').style.display = 'none';
        document.getElementById('captureFaceBtn').style.display = 'inline-flex';
        document.getElementById('stopFaceCamBtn').style.display = 'inline-flex';
        document.getElementById('faceCaptureStatus').textContent = 'Camera active. Position the student\'s face and click Capture.';
        const canvas = document.getElementById('regFaceCanvas');
        if (canvas) canvas.style.display = 'none';
    }
}

async function captureFace() {
    const video = document.getElementById('regStudentVideo');
    const statusEl = document.getElementById('faceCaptureStatus');
    statusEl.textContent = '🔄 Analyzing face...';
    statusEl.style.color = 'var(--warning)';

    const descriptor = await extractDescriptor(video);
    if (!descriptor) {
        statusEl.textContent = '❌ No face detected. Please try again.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    capturedFaceDescriptor = descriptor;

    // Draw snapshot on canvas
    const canvas = document.getElementById('regFaceCanvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.style.display = 'block';

    closeCamera('regStudentVideo');
    document.getElementById('captureFaceBtn').style.display = 'none';
    document.getElementById('stopFaceCamBtn').style.display = 'none';
    document.getElementById('startFaceCamBtn').style.display = 'inline-flex';
    document.getElementById('startFaceCamBtn').textContent = '🔄 Recapture';

    statusEl.textContent = '✅ Face captured successfully!';
    statusEl.style.color = 'var(--success)';
}

function stopFaceCapture() {
    closeCamera('regStudentVideo');
    document.getElementById('startFaceCamBtn').style.display = 'inline-flex';
    document.getElementById('startFaceCamBtn').textContent = '📷 Start Camera';
    document.getElementById('captureFaceBtn').style.display = 'none';
    document.getElementById('stopFaceCamBtn').style.display = 'none';
    document.getElementById('faceCaptureStatus').textContent = '';
    const canvas = document.getElementById('regFaceCanvas');
    if (canvas) canvas.style.display = 'none';
}

// ══════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD — FACE REGISTRATION DURING STUDENT ENROLLMENT
// ══════════════════════════════════════════════════════════════════

let adminCapturedFaceDescriptor = null;

async function startAdminFaceCapture() {
    const ok = await openCamera('adminRegStudentVideo');
    if (ok) {
        document.getElementById('adminStartFaceCamBtn').style.display = 'none';
        document.getElementById('adminCaptureFaceBtn').style.display = 'inline-flex';
        document.getElementById('adminStopFaceCamBtn').style.display = 'inline-flex';
        document.getElementById('adminFaceCaptureStatus').textContent = 'Camera active. Position the student\'s face and click Capture.';
        const canvas = document.getElementById('adminRegFaceCanvas');
        if (canvas) canvas.style.display = 'none';
    }
}

async function captureAdminFace() {
    const video = document.getElementById('adminRegStudentVideo');
    const statusEl = document.getElementById('adminFaceCaptureStatus');
    statusEl.textContent = '🔄 Analyzing face...';
    statusEl.style.color = 'var(--warning)';

    const descriptor = await extractDescriptor(video);
    if (!descriptor) {
        statusEl.textContent = '❌ No face detected. Please try again.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    adminCapturedFaceDescriptor = descriptor;

    const canvas = document.getElementById('adminRegFaceCanvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.style.display = 'block';

    closeCamera('adminRegStudentVideo');
    document.getElementById('adminCaptureFaceBtn').style.display = 'none';
    document.getElementById('adminStopFaceCamBtn').style.display = 'none';
    document.getElementById('adminStartFaceCamBtn').style.display = 'inline-flex';
    document.getElementById('adminStartFaceCamBtn').textContent = '🔄 Recapture';

    statusEl.textContent = '✅ Face captured successfully!';
    statusEl.style.color = 'var(--success)';
}

function stopAdminFaceCapture() {
    closeCamera('adminRegStudentVideo');
    document.getElementById('adminStartFaceCamBtn').style.display = 'inline-flex';
    document.getElementById('adminStartFaceCamBtn').textContent = '📷 Start Camera';
    document.getElementById('adminCaptureFaceBtn').style.display = 'none';
    document.getElementById('adminStopFaceCamBtn').style.display = 'none';
    document.getElementById('adminFaceCaptureStatus').textContent = '';
    const canvas = document.getElementById('adminRegFaceCanvas');
    if (canvas) canvas.style.display = 'none';
}

// ── Student Registration (Teacher) ──────────────────────────────
async function handleRegisterStudent(e) {
    e.preventDefault();
    const props = ['newStudentName', 'newStudentRoll', 'newStudentEmail', 'newStudentBranch', 'newStudentPassword', 'newStudentYear', 'newStudentCourse'];
    const d = {};
    props.forEach(p => d[p.replace('newStudent', '').toLowerCase()] = document.getElementById(p).value);
    d.rollNumber = d.roll;

    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    d.teacher_email = user.email || '';

    if (!capturedFaceDescriptor) {
        showNotification('Please capture the student\'s face before registering.', true);
        return;
    }

    try {
        const data = await api.post('/api/register-student', d);
        if (data.success) {
            showNotification(data.message);

            // Save face descriptor
            await api.post('/api/face-data', {
                student_email: d.email,
                descriptor: capturedFaceDescriptor
            });
            showNotification('Face data saved!');

            capturedFaceDescriptor = null;
            e.target.reset();
            stopFaceCapture();
            if (typeof fetchTeacherStudents === 'function') fetchTeacherStudents();
        } else showNotification(data.message, true);
    } catch (err) { showNotification('Server error.', true); }
}

// ── Student Registration (Admin) ────────────────────────────────
async function handleAdminRegisterStudent(e) {
    e.preventDefault();
    const d = {
        name: document.getElementById('adminStudentName').value,
        rollNumber: document.getElementById('adminStudentRoll').value,
        email: document.getElementById('adminStudentEmail').value,
        branch: document.getElementById('adminStudentBranch').value,
        password: document.getElementById('adminStudentPassword').value,
        year: document.getElementById('adminStudentYear').value,
        teacher_email: document.getElementById('adminStudentTeacher').value,
        course: document.getElementById('adminStudentCourse').value
    };

    if (!adminCapturedFaceDescriptor) {
        showNotification('Please capture the student\'s face before registering.', true);
        return;
    }

    try {
        const data = await api.post('/api/register-student', d);
        if (data.success) {
            showNotification(data.message);

            await api.post('/api/face-data', {
                student_email: d.email,
                descriptor: adminCapturedFaceDescriptor
            });
            showNotification('Face data saved!');

            adminCapturedFaceDescriptor = null;
            e.target.reset();
            stopAdminFaceCapture();
            fetchAdminUsers();
        } else showNotification(data.message, true);
    } catch (err) { showNotification('Error.', true); }
}

// ══════════════════════════════════════════════════════════════════
// TEACHER DASHBOARD — ATTENDANCE VIA FACE RECOGNITION
// ══════════════════════════════════════════════════════════════════

let recognizedStudents = []; // [{email, name, distance}]

async function startAttendanceCamera() {
    const subject = document.getElementById('subjectSelect').value;
    if (!subject) return showNotification('Please select a subject first.', true);

    const loaded = await loadFaceModels();
    if (!loaded) return;

    const ok = await openCamera('teacherVideo');
    if (ok) {
        document.getElementById('captureBtn').style.display = 'inline-flex';
        document.getElementById('recognitionResults').style.display = 'none';
    }
}

async function captureGroupPhoto() {
    const video = document.getElementById('teacherVideo');
    if (!video || !video.srcObject || video.readyState !== 4) {
        return showNotification('Camera not ready.', true);
    }

    showNotification('🔄 Scanning faces... please wait.');

    // Capture frame to canvas for processing
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    await recognizeFacesFromElement(canvas);
}

function stopAttendanceCamera() {
    closeCamera('teacherVideo');
    document.getElementById('captureBtn').style.display = 'none';
}

// Photo Upload
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('uploadedPreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
        document.getElementById('recognizeUploadBtn').style.display = 'inline-flex';
    };
    reader.readAsDataURL(file);
}

async function recognizeUploadedPhoto() {
    const subject = document.getElementById('subjectSelect').value;
    if (!subject) return showNotification('Please select a subject first.', true);

    const loaded = await loadFaceModels();
    if (!loaded) return;

    const img = document.getElementById('uploadedPreview');
    showNotification('🔄 Scanning uploaded photo... please wait.');
    await recognizeFacesFromElement(img);
}

// Core Recognition Logic
async function recognizeFacesFromElement(element) {
    try {
        // Get all stored face descriptors
        const faceDataResp = await api.get('/api/face-data');
        if (!faceDataResp.success || !faceDataResp.face_data.length) {
            showNotification('No registered faces found. Please register students first.', true);
            return;
        }

        // Build labeled face descriptors
        const labeledDescriptors = faceDataResp.face_data.map(fd => {
            return new faceapi.LabeledFaceDescriptors(
                fd.student_email,
                [new Float32Array(fd.descriptor)]
            );
        });

        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

        // Detect all faces in the image/canvas
        const detections = await faceapi
            .detectAllFaces(element, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptors();

        const totalFaces = detections.length;

        if (totalFaces === 0) {
            showNotification('No faces detected in the image.', true);
            return;
        }

        // Match each detected face
        const tempRecognized = [];
        const selectedSubject = document.getElementById('subjectSelect').value;
        const yearFilter = document.getElementById('attendanceYearFilter')?.value || 'all';

        // Get users for name lookup and filtering
        const usersResp = await api.get('/api/users');
        const allUsers = usersResp.success ? usersResp.users : [];

        detections.forEach(det => {
            const match = faceMatcher.findBestMatch(det.descriptor);
            if (match.label !== 'unknown') {
                const student = allUsers.find(u => u.email === match.label);
                if (student) {
                    // 1. Apply year filter
                    if (yearFilter !== 'all' && String(student.year) !== String(yearFilter)) return;
                    
                    // 2. Apply enrollment filter
                    // student.course can be a comma-separated string of "Subject Name (Code)"
                    const enrolledCourses = student.course ? student.course.split(',').map(c => c.trim().toLowerCase()) : [];
                    const isEnrolled = enrolledCourses.some(c => c === selectedSubject.toLowerCase());
                    
                    if (!isEnrolled) {
                        console.warn(`Student ${student.email} detected but not enrolled in ${selectedSubject}`);
                        return;
                    }

                    tempRecognized.push({
                        email: student.email,
                        name: student.name || student.email,
                        roll: student.roll_number || 'N/A',
                        year: student.year,
                        distance: match.distance,
                        checked: true
                    });
                }
            }
        });

        // DE-DUPLICATION: Keep only the best match (lowest distance) for each student email
        const uniqueMap = new Map();
        tempRecognized.forEach(s => {
            if (!uniqueMap.has(s.email) || s.distance < uniqueMap.get(s.email).distance) {
                uniqueMap.set(s.email, s);
            }
        });
        recognizedStudents = Array.from(uniqueMap.values());

        // Format distance for display after de-duplication
        recognizedStudents.forEach(s => {
            s.confidence = ((1 - s.distance) * 100).toFixed(1);
        });

        // Show results
        const resultsDiv = document.getElementById('recognitionResults');
        const countDiv = document.getElementById('faceCountDisplay');
        const listDiv = document.getElementById('matchedStudentsList');

        countDiv.innerHTML = `Detected <strong>${totalFaces}</strong> face(s) | Matched <strong style="color:var(--success)">${recognizedStudents.length}</strong> student(s)`;

        if (recognizedStudents.length === 0) {
            listDiv.innerHTML = '<p style="color: var(--text-secondary);">No registered students matched. They may not have face data registered.</p>';
        } else {
            listDiv.innerHTML = recognizedStudents.map((s, i) => `
                <div class="matched-student-row">
                    <label style="display:flex; align-items:center; gap:12px; cursor:pointer;">
                        <input type="checkbox" checked data-index="${i}" class="attendance-check" style="width:18px; height:18px; accent-color:var(--success);">
                        <div>
                            <strong>${s.name}</strong>
                            <span style="color:var(--text-secondary); font-size:0.85rem;"> — ${s.roll} | Year ${s.year || 'N/A'} | Confidence: ${s.confidence}%</span>
                        </div>
                    </label>
                </div>
            `).join('');
        }

        resultsDiv.style.display = 'block';
        showNotification(`Recognized ${recognizedStudents.length} student(s) out of ${totalFaces} face(s)!`);

    } catch (err) {
        console.error('Recognition error:', err);
        showNotification('Error during face recognition.', true);
    }
}

async function saveRecognizedAttendance() {
    const subject = document.getElementById('subjectSelect').value;
    if (!subject) return showNotification('Please select a subject.', true);

    const checkboxes = document.querySelectorAll('.attendance-check');
    const records = [];
    const excelRows = [];
    checkboxes.forEach((cb, i) => {
        if (cb.checked && recognizedStudents[i]) {
            records.push({ email: recognizedStudents[i].email, status: 'present' });
            excelRows.push({
                'Name': recognizedStudents[i].name,
                'Roll Number': recognizedStudents[i].roll,
                'Email': recognizedStudents[i].email,
                'Year': recognizedStudents[i].year || 'N/A',
                'Subject': subject,
                'Status': 'Present',
                'Date': new Date().toLocaleDateString(),
                'Time': new Date().toLocaleTimeString()
            });
        }
    });

    if (records.length === 0) return showNotification('No students selected.', true);

    try {
        const data = await api.post('/api/attendance/bulk', { records, subject });
        if (data.success) {
            showNotification(data.message);

            // Generate Excel sheet
            generateExcel(excelRows, subject);

            document.getElementById('recognitionResults').style.display = 'none';
            recognizedStudents = [];
            // Reset upload
            const uploadPreview = document.getElementById('uploadedPreview');
            const recognizeBtn = document.getElementById('recognizeUploadBtn');
            const photoUpload = document.getElementById('photoUpload');
            if (uploadPreview) uploadPreview.style.display = 'none';
            if (recognizeBtn) recognizeBtn.style.display = 'none';
            if (photoUpload) photoUpload.value = '';
        } else showNotification(data.message, true);
    } catch (err) { showNotification('Error saving attendance.', true); }
}

// ── Excel Export (SheetJS) ──────────────────────────────────────
function generateExcel(rows, subject) {
    if (!rows.length) return;
    // Use SheetJS loaded from CDN
    if (typeof XLSX === 'undefined') {
        showNotification('Excel library not loaded. Download manually.', true);
        return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    // Set column widths
    ws['!cols'] = [
        {wch: 20}, {wch: 15}, {wch: 25}, {wch: 8}, {wch: 25}, {wch: 10}, {wch: 12}, {wch: 12}
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = subject.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `Attendance_${safeName}_${dateStr}.xlsx`);
    showNotification('Excel sheet downloaded!');
}

// ── Student List (Teacher) ──────────────────────────────────────
let teacherStudentList = [];
async function fetchTeacherStudents() {
    try {
        const data = await api.get('/api/users');
        if (data.success) {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            teacherStudentList = data.users.filter(u => u.role === 'student' && u.teacher_email === user.email);
            renderTeacherStudents();
        }
    } catch (err) { console.error('Students fetch failed'); }
}

function renderTeacherStudents() {
    const tbody = document.getElementById('teacherStudentsBody');
    if (!tbody) return;

    const year = document.getElementById('filterStudentYear')?.value || 'all';
    const course = document.getElementById('filterStudentCourse')?.value || 'all';

    let filtered = teacherStudentList;
    if (year !== 'all') filtered = filtered.filter(u => String(u.year) === String(year));
    if (course !== 'all') {
        const f = course.toLowerCase();
        filtered = filtered.filter(u => u.course && (u.course.toLowerCase().includes(f) || f.includes(u.course.toLowerCase())));
    }

    tbody.innerHTML = filtered.map(u => `
        <tr>
            <td>${u.name}</td>
            <td>${u.roll_number || 'N/A'}</td>
            <td>${u.branch || 'N/A'}</td>
            <td>${u.year ? 'Year ' + u.year : 'N/A'}</td>
            <td>${u.course ? u.course.toUpperCase() : 'N/A'}</td>
            <td id="face-status-${u.email}"><span class="badge" style="background:rgba(100,100,100,0.2); color:var(--text-secondary);">Checking...</span></td>
        </tr>
    `).join('');

    // Check face status for each student
    filtered.forEach(u => {
        api.get(`/api/face-data/${u.email}`).then(data => {
            const el = document.getElementById(`face-status-${u.email}`);
            if (el) {
                el.innerHTML = data.has_face
                    ? '<span class="badge badge-success">✅ Registered</span>'
                    : '<span class="badge badge-danger">❌ Missing</span>';
            }
        });
    });
}

// ══════════════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ══════════════════════════════════════════════════════════════════

async function handleAdminAddSubject(e) {
    e.preventDefault();
    const d = { name: document.getElementById('newSubjectName').value, code: document.getElementById('newSubjectCode').value, year: document.getElementById('newSubjectYear').value };
    try {
        const data = await api.post('/api/subjects', d);
        if (data.success) { showNotification(data.message); e.target.reset(); fetchSubjects(); }
        else showNotification(data.message, true);
    } catch (err) { showNotification('Error.', true); }
}

async function handleAdminRegisterTeacher(e) {
    e.preventDefault();
    const d = { name: document.getElementById('adminTeacherName').value, email: document.getElementById('adminTeacherEmail').value, password: document.getElementById('adminTeacherPassword').value, course: document.getElementById('adminTeacherSubject').value };
    try {
        const data = await api.post('/api/register', d);
        if (data.success) { showNotification(data.message); e.target.reset(); fetchAdminUsers(); }
        else showNotification(data.message, true);
    } catch (err) { showNotification('Error.', true); }
}

async function handleAdminAssignSubject(e) {
    e.preventDefault();
    try {
        const data = await api.post('/api/assign-course', { email: document.getElementById('assignSubjectTeacher').value, new_course: document.getElementById('assignSubjectSelect').value });
        if (data.success) { showNotification(data.message); e.target.reset(); fetchAdminUsers(); }
        else showNotification(data.message, true);
    } catch (err) { showNotification('Error.', true); }
}

async function handleAdminDeleteUser(id, name) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
        const data = await api.del(`/api/delete-user/${id}`);
        if (data.success) { showNotification(data.message); fetchAdminUsers(); }
    } catch (err) { showNotification('Error.', true); }
}

async function handleAdminResetPassword(id, name) {
    const pw = prompt(`New password for ${name}:`);
    if (!pw?.trim()) return;
    try {
        const data = await api.post('/api/reset-password', { user_id: id, new_password: pw.trim() });
        if (data.success) showNotification(data.message);
    } catch (err) { showNotification('Error.', true); }
}

// ── Subjects & Users Fetching ───────────────────────────────────
let allAdminUsers = [], allSubjects = [];

async function fetchSubjects() {
    try {
        const data = await api.get('/api/subjects?t=' + Date.now());
        if (data.success) { allSubjects = data.subjects; populateSubjectDropdowns(); }
    } catch (err) { console.error('Subjects fetch failed'); }
}

function populateSubjectDropdowns() {
    const ids = ['adminTeacherSubject', 'assignSubjectSelect', 'adminStudentCourse', 'subjectSelect', 'filterStudentCourse', 'newStudentCourse'];
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        let list = [...allSubjects];
        if (user.role === 'teacher' && ['subjectSelect', 'filterStudentCourse'].includes(id) && user.course) {
            const my = user.course.split(',').map(c => c.trim().toLowerCase());
            list = allSubjects.filter(s => my.includes(`${s.name} (${s.code})`.toLowerCase()) || my.includes(s.name.toLowerCase()));
        }

        list.sort((a, b) => (a.year || 9) - (b.year || 9) || a.name.localeCompare(b.name));
        const val = el.value;
        const def = (id === 'adminStudentCourse' || id === 'newStudentCourse') ? '-- Select Course --' : (id === 'filterStudentCourse' ? 'All Courses' : '-- Select Subject --');
        el.innerHTML = `<option value="${id === 'filterStudentCourse' ? 'all' : ''}">${def}</option>` +
            list.map(s => `<option value="${s.name} (${s.code})">${s.name} (${s.code})${s.year && s.year !== 'Other' ? (isNaN(s.year) ? ' - ' + s.year : ' - Year ' + s.year) : ''}</option>`).join('');
        if (val) el.value = val;
    });
}

async function fetchAdminUsers() {
    try {
        const data = await api.get('/api/users');
        if (data.success) {
            allAdminUsers = data.users;

            const extraFilter = document.getElementById('filterExtra');
            if (extraFilter) {
                const years = [...new Set(allAdminUsers.filter(u => u.role === 'student' && u.year).map(u => u.year))].sort();
                const courses = [...new Set(allAdminUsers.filter(u => u.role === 'teacher' && u.course).map(u => u.course))].sort();

                let html = '<option value="all">All Year/Course</option>';
                if (years.length) html += '<optgroup label="Search by Year">' + years.map(y => `<option value="y-${y}">Year ${y}</option>`).join('') + '</optgroup>';
                if (courses.length) html += '<optgroup label="Search by Course">' + courses.map(c => `<option value="c-${c}">${c}</option>`).join('') + '</optgroup>';
                extraFilter.innerHTML = html;
            }

            renderAdminUsers();
            const ts = allAdminUsers.filter(u => u.role === 'teacher');
            const allUsersForAssign = allAdminUsers.filter(u => u.role !== 'admin'); // Teachers and Students

            const teacherSelect = document.getElementById('adminStudentTeacher');
            if (teacherSelect) teacherSelect.innerHTML = `<option value="">-- ${ts.length ? 'Select Teacher' : 'No Teachers'} --</option>` +
                ts.map(t => `<option value="${t.email}">${t.name} - ${t.email}</option>`).join('');

            const assignSelect = document.getElementById('assignSubjectTeacher');
            if (assignSelect) assignSelect.innerHTML = `<option value="">-- Select User (Student/Teacher) --</option>` +
                allUsersForAssign.map(u => `<option value="${u.email}">${u.role.toUpperCase()}: ${u.name} (${u.email})</option>`).join('');
        }
    } catch (err) { console.error('Users fetch failed'); }
}

function renderAdminUsers() {
    const tbody = document.getElementById('adminUsersBody');
    if (!tbody) return;
    const role = document.getElementById('filterRole').value, extra = document.getElementById('filterExtra').value;
    let filtered = allAdminUsers;

    if (role !== 'all') filtered = filtered.filter(u => u.role === role);
    if (extra !== 'all') {
        if (extra.startsWith('y-')) filtered = filtered.filter(u => u.role === 'student' && String(u.year) === extra.split('-')[1]);
        else if (extra.startsWith('c-')) {
            const courseVal = extra.split('-')[1].toLowerCase();
            filtered = filtered.filter(u => u.role === 'teacher' && u.course && u.course.toLowerCase().includes(courseVal));
        }
    }

    tbody.innerHTML = filtered.map(u => `
        <tr>
            <td><span class="badge ${u.role === 'teacher' ? 'badge-success' : 'badge-primary'}" style="${u.role === 'student' ? 'background:var(--primary);color:white;padding:5px 10px;border-radius:12px;font-size:12px;' : ''}">${u.role.toUpperCase()}</span></td>
            <td>${u.name}</td><td>${u.email}</td><td>${u.roll_number ? u.roll_number + ' / ' + u.branch : 'N/A'}</td>
            <td>${u.role === 'teacher' ? (u.course?.toUpperCase() || 'N/A') : (u.year ? 'Year ' + u.year : 'N/A')}</td>
            <td style="display:flex; gap:5px;">
                <button onclick="handleAdminResetPassword('${u.id}', '${u.name}')" class="btn btn-secondary" style="background:var(--warning); color:white; border:none; padding:4px 8px; font-size:12px; border-radius:4px;">Reset</button>
                <button onclick="handleAdminDeleteUser('${u.id}', '${u.name}')" class="btn btn-secondary" style="background:#dc3545; color:white; border:none; padding:4px 8px; font-size:12px; border-radius:4px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

// ── Student Dashboard ───────────────────────────────────────────
function initStudentDashboard(u) {
    const el = document.getElementById('studentNameDisplay');
    if (el) el.textContent = u.name || 'Student';

    const subList = document.getElementById('studentSubjectsList');
    if (subList) {
        if (u.course) {
            subList.innerHTML = u.course.split(',').map(s => `<span class="badge badge-primary">${s.trim()}</span>`).join('');
        } else {
            subList.innerHTML = '<span style="color:var(--text-secondary);">No subjects enrolled yet.</span>';
        }
    }

    // Fetch and display attendance
    const email = u.email;
    if (!email) return;

    api.get(`/api/attendance/${email}`).then(data => {
        if (data.success) {
            const records = data.attendance || [];
            const tbody = document.getElementById('studentAttendanceBody');
            const recent = document.getElementById('studentRecentRecords');
            const overall = document.getElementById('overallAttendanceValue');
            const count = document.getElementById('totalClassesValue');
            const target = document.getElementById('attendanceTargetStatus');

            if (records.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding:20px;">No attendance records yet.</td></tr>';
                if (recent) recent.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-secondary);">No recent records found.</div>';
                if (overall) overall.textContent = '0%';
                if (count) count.textContent = '0';
                if (target) target.textContent = 'No data';
                return;
            }

            // Create subject-wise stats for better visualization if needed, but for now just fix table
            if (tbody) tbody.innerHTML = records.map(r => `
                <tr class="attendance-row">
                    <td><div style="font-weight:600;">${r.subject}</div></td>
                    <td><span class="badge ${r.status.toLowerCase() === 'present' ? 'badge-success' : 'badge-danger'}">${r.status.toUpperCase()}</span></td>
                    <td>${r.date}</td>
                    <td><span style="color:var(--text-secondary); font-size:0.9rem;">${r.time}</span></td>
                </tr>
            `).join('');

            if (recent) recent.innerHTML = records.slice(0, 5).map(r => `
                <div class="recent-record-item" style="padding: 14px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight:600; font-size:0.95rem;">${r.subject}</div>
                        <div style="color:var(--text-secondary); font-size:0.8rem;">${r.date} at ${r.time}</div>
                    </div>
                    <span class="badge ${r.status.toLowerCase() === 'present' ? 'badge-success' : 'badge-danger'}" style="font-size:0.75rem;">${r.status.toUpperCase()}</span>
                </div>
            `).join('');

            if (count) count.textContent = records.length;
            if (overall) {
                const presentCount = records.filter(r => r.status.toLowerCase() === 'present').length;
                const percentage = Math.round((presentCount / records.length) * 100);
                overall.textContent = `${percentage}%`;
                
                if (target) {
                    if (percentage >= 75) {
                        target.textContent = 'Above target';
                        target.style.color = 'var(--success)';
                    } else if (percentage >= 60) {
                        target.textContent = 'Near target';
                        target.style.color = 'var(--warning)';
                    } else {
                        target.textContent = 'Below target';
                        target.style.color = 'var(--danger)';
                    }
                }
            }
        }
    }).catch(err => {
        console.error('Failed to fetch attendance:', err);
    });
}

// ── Initialization ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    fetchSubjects();
    if (!user) return;

    const path = window.location.pathname;

    if (path.includes('admin.html')) {
        if (user.role !== 'admin') return window.location.href = 'index.html';
        initAdminDashboard(user);
    } else if (path.includes('teacher.html')) {
        if (user.role !== 'teacher') return window.location.href = 'index.html';
        initTeacherDashboard(user);
        initTeacherReportUI(user);
    } else if (path.includes('student.html')) {
        if (user.role !== 'student') return window.location.href = 'index.html';
        initStudentDashboard(user);
    }

    if (user.role !== 'admin') {
        api.get('/api/users').then(data => {
            if (data.success) {
                const latest = data.users.find(u => u.email === user.email);
                if (latest) {
                    localStorage.setItem('currentUser', JSON.stringify(latest));
                    if (latest.role !== user.role) {
                        window.location.href = 'index.html';
                    } else {
                        // Re-trigger init if we are on the student page to ensure latest course data is used
                        if (path.includes('student.html')) initStudentDashboard(latest);
                        if (path.includes('teacher.html')) {
                            initTeacherDashboard(latest); 
                            initTeacherReportUI(latest);
                        }
                    }
                }
            }
        });
    }
});

function initTeacherDashboard(u) {
    const el = document.getElementById('teacherNameDisplay');
    if (el) el.textContent = u.name || 'Teacher';
    if (document.getElementById('teacherStudentsBody')) fetchTeacherStudents();
    // Auto-load face models on teacher dashboard
    loadFaceModels();
}

function initAdminDashboard(u) {
    const el = document.getElementById('adminNameDisplay');
    if (el) el.textContent = u.name || 'Admin';
    fetchAdminUsers();
}
