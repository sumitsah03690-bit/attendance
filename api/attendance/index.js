const { getDb } = require('../../lib/db');

const { ObjectId } = require('mongodb');

module.exports = async function handler(req, res) {
  const db = await getDb();

  // ── PUT: Dispute queries (create / list / resolve) ──
  if (req.method === 'PUT') {
    const { action } = req.body || {};

    try {
      // CREATE a new dispute
      if (action === 'create') {
        const { student_email, student_name, subject, date, message, teacher_email } = req.body;
        if (!student_email || !subject || !date) {
          return res.status(400).json({ success: false, message: 'Student email, subject and date are required.' });
        }
        await db.collection('disputes').insertOne({
          student_email,
          student_name: student_name || '',
          subject,
          date,
          message: message || '',
          teacher_email: teacher_email || '',
          status: 'pending',
          resolved_note: '',
          created_at: new Date()
        });
        return res.json({ success: true, message: 'Dispute submitted! Your teacher will review it.' });
      }

      // LIST disputes (by student or teacher)
      if (action === 'list') {
        const { student_email, teacher_email } = req.body;
        const filter = {};
        if (student_email) filter.student_email = student_email;
        if (teacher_email) filter.teacher_email = teacher_email;
        const disputes = await db.collection('disputes').find(filter).sort({ created_at: -1 }).toArray();
        const mapped = disputes.map(d => ({
          id: d._id.toString(),
          student_email: d.student_email,
          student_name: d.student_name,
          subject: d.subject,
          date: d.date,
          message: d.message,
          status: d.status,
          resolved_note: d.resolved_note || '',
          created_at: d.created_at
        }));
        return res.json({ success: true, disputes: mapped });
      }

      // RESOLVE a dispute (teacher)
      if (action === 'resolve') {
        const { dispute_id, resolved_note } = req.body;
        if (!dispute_id) return res.status(400).json({ success: false, message: 'Dispute ID required.' });
        let oid;
        try { oid = new ObjectId(dispute_id); } catch { return res.status(400).json({ success: false, message: 'Invalid dispute ID.' }); }
        await db.collection('disputes').updateOne(
          { _id: oid },
          { $set: { status: 'resolved', resolved_note: resolved_note || '', resolved_at: new Date() } }
        );
        return res.json({ success: true, message: 'Dispute resolved!' });
      }

      return res.status(400).json({ success: false, message: 'Invalid action. Use create, list, or resolve.' });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

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
  // Convert to IST (UTC+5:30) — Vercel servers run in UTC
  const istOptions = { timeZone: 'Asia/Kolkata' };
  const date = now.toLocaleDateString('en-CA', istOptions); // en-CA gives YYYY-MM-DD format
  const time = now.toLocaleTimeString('en-GB', istOptions); // en-GB gives HH:MM:SS 24hr format

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

