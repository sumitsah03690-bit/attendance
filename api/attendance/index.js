const { getDb } = require('../../lib/db');

module.exports = async function handler(req, res) {
  const db = await getDb();

  // ── DELETE: Clear attendance records ──
  if (req.method === 'DELETE') {
    try {
      const subject = req.query?.subject || req.body?.subject || null;
      const date = req.query?.date || req.body?.date || null;
      const clearAll = req.query?.all === 'true' || req.body?.all === true;

      const filter = {};

      if (!clearAll) {
        if (subject && subject !== 'all') filter.subject = subject;
        if (date) filter.date = date;
        if (Object.keys(filter).length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Specify subject, date, or all=true to clear attendance.'
          });
        }
      }

      const result = await db.collection('attendance').deleteMany(filter);
      return res.json({
        success: true,
        message: `Cleared ${result.deletedCount} attendance record(s).`,
        deleted_count: result.deletedCount
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  // ── POST: Save attendance records ──
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { student_email, subject, status, records } = req.body || {};

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

