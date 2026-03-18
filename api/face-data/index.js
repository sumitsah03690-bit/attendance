const { getDb } = require('../../lib/db');

module.exports = async function handler(req, res) {
  const db = await getDb();

  if (req.method === 'POST') {
    const { student_email, descriptor } = req.body || {};

    if (!student_email || !descriptor) {
      return res.status(400).json({ success: false, message: 'Student email and face descriptor are required.' });
    }

    try {
      // Upsert: replace existing descriptor or insert new one
      await db.collection('face_data').updateOne(
        { student_email },
        {
          $set: {
            student_email,
            descriptor: JSON.stringify(descriptor),
            created_at: new Date()
          }
        },
        { upsert: true }
      );

      return res.json({ success: true, message: 'Face data saved!' });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const rows = await db.collection('face_data').find({}).toArray();

      const result = rows.map(r => ({
        student_email: r.student_email,
        descriptor: JSON.parse(r.descriptor)
      }));

      return res.json({ success: true, message: 'Fetched face data', face_data: result });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};
