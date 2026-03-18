const { getDb } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { records, subject } = req.body || {};

  if (!records || !records.length || !subject) {
    return res.status(400).json({ success: false, message: 'Records and subject are required.' });
  }

  try {
    const db = await getDb();
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    const docs = records.map(r => ({
      student_email: r.email || '',
      subject,
      status: r.status || 'present',
      date,
      time
    }));

    await db.collection('attendance').insertMany(docs);

    return res.json({ success: true, message: `${records.length} attendance records saved!` });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
