const { getDb } = require('../../lib/db');

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
    const records = await db.collection('attendance')
      .find({ student_email: email })
      .sort({ date: -1, time: -1 })
      .toArray();

    const mapped = records.map(r => ({
      id: r._id.toString(),
      student_email: r.student_email,
      subject: r.subject,
      status: r.status,
      date: r.date,
      time: r.time
    }));

    return res.json({ success: true, message: 'Fetched attendance', attendance: mapped });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
