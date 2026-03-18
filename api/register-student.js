const { getDb } = require('../lib/db');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { name, email, password, rollNumber, branch, year, course, teacher_email } = req.body || {};

  if (!name || !email || !password || !rollNumber) {
    return res.status(400).json({ success: false, message: 'Name, email, roll number and password are required.' });
  }

  try {
    const db = await getDb();
    const hashed = await bcrypt.hash(password, 10);

    await db.collection('users').insertOne({
      email,
      password: hashed,
      role: 'student',
      name,
      roll_number: rollNumber,
      branch: branch || '',
      year: year ? parseInt(year) : null,
      course: course || '',
      teacher_email: teacher_email || '',
      created_at: new Date()
    });

    return res.json({ success: true, message: `Student ${name} registered!` });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email or roll number already exists.' });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
};
