const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  const client = new MongoClient(uri);
  await client.connect();

  cachedClient = client;
  cachedDb = client.db(); // uses the DB name from the connection string (attendance_db)

  // Create indexes (idempotent — safe to call every time)
  await cachedDb
    .collection("users")
    .createIndex({ email: 1 }, { unique: true });
  await cachedDb
    .collection("subjects")
    .createIndex({ code: 1 }, { unique: true });
  await cachedDb
    .collection("face_data")
    .createIndex({ student_email: 1 }, { unique: true });

  return cachedDb;
}

module.exports = { getDb };
