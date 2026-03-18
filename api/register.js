const { getDb } = require('../lib/db');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { name, email, password, course } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }

  try {
    const db = await getDb();
    const hashed = await bcrypt.hash(password, 10);

    await db.collection('users').insertOne({
      email,
      password: hashed,
      role: 'teacher',
      name,
      course: course || '',
      created_at: new Date()
    });

    return res.json({ success: true, message: 'Teacher account created!' });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already exists.' });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
};
