const { getDb } = require('../../lib/db');

module.exports = async function handler(req, res) {
  const db = await getDb();

  if (req.method === 'POST') {
    const { student_email, descriptor, descriptors, replace } = req.body || {};

    if (!student_email || (!descriptor && (!descriptors || !descriptors.length))) {
      return res.status(400).json({ success: false, message: 'Student email and face descriptor(s) are required.' });
    }

    try {
      // Support both single descriptor and array of descriptors
      const newDescriptors = descriptors || [descriptor];

      if (replace) {
        // Full replace: store all new descriptors (used by multi-capture registration)
        await db.collection('face_data').updateOne(
          { student_email },
          {
            $set: {
              student_email,
              descriptors: JSON.stringify(newDescriptors),
              descriptor: JSON.stringify(newDescriptors[0]), // backward compat
              updated_at: new Date()
            },
            $setOnInsert: { created_at: new Date() }
          },
          { upsert: true }
        );
      } else {
        // Append mode: add to existing descriptors (max 5)
        const existing = await db.collection('face_data').findOne({ student_email });
        let allDescriptors = [];
        if (existing && existing.descriptors) {
          allDescriptors = JSON.parse(existing.descriptors);
        } else if (existing && existing.descriptor) {
          allDescriptors = [JSON.parse(existing.descriptor)];
        }
        allDescriptors.push(...newDescriptors);
        // Keep only the last 5 descriptors
        if (allDescriptors.length > 5) allDescriptors = allDescriptors.slice(-5);

        await db.collection('face_data').updateOne(
          { student_email },
          {
            $set: {
              student_email,
              descriptors: JSON.stringify(allDescriptors),
              descriptor: JSON.stringify(allDescriptors[0]),
              updated_at: new Date()
            },
            $setOnInsert: { created_at: new Date() }
          },
          { upsert: true }
        );
      }

      return res.json({ success: true, message: 'Face data saved!' });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const rows = await db.collection('face_data').find({}).toArray();

      const result = rows.map(r => {
        // Support both new multi-descriptor and legacy single-descriptor format
        let descs = [];
        if (r.descriptors) {
          descs = JSON.parse(r.descriptors);
        } else if (r.descriptor) {
          descs = [JSON.parse(r.descriptor)];
        }
        return {
          student_email: r.student_email,
          descriptor: descs[0] || [],        // backward compat
          descriptors: descs                  // new: all descriptors
        };
      });

      return res.json({ success: true, message: 'Fetched face data', face_data: result });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};
