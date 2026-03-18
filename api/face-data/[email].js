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
    const count = await db.collection('face_data').countDocuments({ student_email: email });

    return res.json({ success: true, message: 'Checked', has_face: count > 0 });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
