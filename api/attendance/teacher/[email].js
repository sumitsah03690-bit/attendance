const { getDb } = require('../../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    const db = await getDb();

    // 1. Get teacher's subjects
    const teacher = await db.collection('users').findOne({ email, role: 'teacher' });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    const subjects = teacher.course ? teacher.course.split(',').map(s => s.trim()) : [];
    if (subjects.length === 0) {
      return res.json({ success: true, attendance: [] });
    }

    // 2. Get attendance records for these subjects
    const records = await db.collection('attendance')
      .find({ subject: { $in: subjects } })
      .sort({ date: -1, time: -1 })
      .toArray();

    // 3. Get student info for enrichment
    const studentEmails = [...new Set(records.map(r => r.student_email))];
    const students = await db.collection('users')
      .find({ email: { $in: studentEmails } })
      .toArray();

    const studentMap = {};
    students.forEach(s => { studentMap[s.email] = s; });

    const enriched = records.map(r => ({
      id: r._id.toString(),
      student_email: r.student_email,
      subject: r.subject,
      status: r.status,
      date: r.date,
      time: r.time,
      student_name: studentMap[r.student_email]?.name || 'N/A',
      roll: studentMap[r.student_email]?.roll_number || 'N/A'
    }));

    return res.json({ success: true, attendance: enriched });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
