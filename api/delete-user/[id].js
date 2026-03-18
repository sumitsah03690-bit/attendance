const { getDb } = require('../../lib/db');
const { ObjectId } = require('mongodb');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  try {
    const db = await getDb();
    let filter;
    try {
      filter = { _id: new ObjectId(id) };
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    const result = await db.collection('users').deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, message: 'User deleted successfully!' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
