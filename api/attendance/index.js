const { getDb } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { student_email, subject, status } = req.body || {};

  if (!student_email || !subject) {
    return res.status(400).json({ success: false, message: 'Student email and subject are required.' });
  }

  try {
    const db = await getDb();
    const now = new Date();

    await db.collection('attendance').insertOne({
      student_email,
      subject,
      status: status || 'present',
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0]
    });

    return res.json({ success: true, message: 'Attendance recorded!' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
