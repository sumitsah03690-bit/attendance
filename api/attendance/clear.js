const { getDb } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use DELETE or POST.' });
  }

  try {
    const db = await getDb();

    // Accept filters from query params (DELETE) or body (POST)
    const subject = req.query?.subject || req.body?.subject || null;
    const date = req.query?.date || req.body?.date || null;
    const clearAll = req.query?.all === 'true' || req.body?.all === true;

    const filter = {};

    if (!clearAll) {
      if (subject && subject !== 'all') filter.subject = subject;
      if (date) filter.date = date;
      // If neither provided (and not clearAll), require at least one
      if (Object.keys(filter).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Specify subject, date, or all=true to clear attendance.'
        });
      }
    }

    const result = await db.collection('attendance').deleteMany(filter);

    return res.json({
      success: true,
      message: `Cleared ${result.deletedCount} attendance record(s).`,
      deleted_count: result.deletedCount
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
