const { getDb } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { student_email, subject, status, records } = req.body || {};

  const db = await getDb();
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0];

  try {
    // Bulk attendance: if 'records' array is provided
    if (records && Array.isArray(records)) {
      const bulkSubject = subject || req.body.subject;
      if (!records.length || !bulkSubject) {
        return res.status(400).json({ success: false, message: 'Records and subject are required.' });
      }

      const docs = records.map(r => ({
        student_email: r.email || '',
        subject: bulkSubject,
        status: r.status || 'present',
        date,
        time
      }));

      await db.collection('attendance').insertMany(docs);
      return res.json({ success: true, message: `${records.length} attendance records saved!` });
    }

    // Single attendance
    if (!student_email || !subject) {
      return res.status(400).json({ success: false, message: 'Student email and subject are required.' });
    }

    await db.collection('attendance').insertOne({
      student_email,
      subject,
      status: status || 'present',
      date,
      time
    });

    return res.json({ success: true, message: 'Attendance recorded!' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
