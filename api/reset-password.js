const { getDb } = require('../lib/db');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { user_id, new_password } = req.body || {};

  if (!user_id || !new_password) {
    return res.status(400).json({ success: false, message: 'User ID and new password are required.' });
  }

  try {
    const db = await getDb();
    const hashed = await bcrypt.hash(new_password, 10);

    let filter;
    try {
      filter = { _id: new ObjectId(user_id) };
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    await db.collection('users').updateOne(filter, { $set: { password: hashed } });

    return res.json({ success: true, message: 'Password reset successfully!' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
