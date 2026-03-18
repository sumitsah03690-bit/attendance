const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, new_course } = req.body || {};

  if (!email || !new_course) {
    return res.status(400).json({ success: false, message: 'Teacher email and new course are required.' });
  }

  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const currentCourses = user.course || '';
    const coursesList = currentCourses ? currentCourses.split(',').map(c => c.trim()) : [];

    if (coursesList.includes(new_course)) {
      return res.json({ success: true, message: 'Teacher is already assigned to this subject.' });
    }

    coursesList.push(new_course);

    await db.collection('users').updateOne(
      { email },
      { $set: { course: coursesList.join(',') } }
    );

    return res.json({ success: true, message: 'Course assigned to teacher successfully!' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
