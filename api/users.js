const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    // Map _id to id for frontend compatibility
    const mapped = users.map(u => ({
      id: u._id.toString(),
      email: u.email,
      role: u.role,
      name: u.name,
      roll_number: u.roll_number || null,
      branch: u.branch || null,
      year: u.year || null,
      course: u.course || null,
      teacher_email: u.teacher_email || null,
      created_at: u.created_at
    }));

    return res.json({ success: true, message: 'Fetched users', users: mapped });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
