const { getDb } = require('../lib/db');

module.exports = async function handler(req, res) {
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      const subjects = await db.collection('subjects').find({}).sort({ year: 1 }).toArray();
      return res.json({ success: true, message: 'Fetched subjects', subjects });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  if (req.method === 'POST') {
    const { name, code, year } = req.body || {};

    if (!name || !code || !year) {
      return res.status(400).json({ success: false, message: 'Subject Name, Code and Year are required.' });
    }

    try {
      await db.collection('subjects').insertOne({
        name,
        code,
        year: parseInt(year),
        created_at: new Date()
      });

      return res.json({ success: true, message: 'Subject added successfully!' });
    } catch (e) {
      if (e.code === 11000) {
        return res.status(400).json({ success: false, message: 'Subject code already exists.' });
      }
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};
