const { getDb } = require('../lib/db');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, password, role } = req.body || {};

  if (!email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Email, password and role are required.' });
  }

  // Admin login (hardcoded)
  if (role === 'admin') {
    if (email === 'admin@nitw.ac.in' && password === 'admin123') {
      return res.json({ success: true, message: 'Login successful!', user: { email, name: 'Admin', role: 'admin' } });
    }
    return res.status(401).json({ success: false, message: 'Incorrect admin credentials.' });
  }

  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ email, role });

    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    return res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        rollNumber: user.roll_number,
        year: user.year,
        course: user.course
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
