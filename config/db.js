// config/db.js
const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");
const { GridFSBucket } = require("mongodb");

let gfsBucket = null;

// Cache the database connection for serverless
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// 📌 Initialize MongoDB + GridFS
const connectDB = async () => {
  if (cached.conn) {
    // Reuse cached connection
    if (!gfsBucket) {
      gfsBucket = new GridFSBucket(cached.conn.db, {
        bucketName: "videos",
      });
      console.log("🎥 GridFSBucket initialized (bucket: videos)");
    }
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    dbgr("✅ MongoDB Connected Successfully");

    const conn = cached.conn.connection || cached.conn;

    // Initialize GridFSBucket after connection is established
    gfsBucket = new GridFSBucket(conn.db, {
      bucketName: "videos",
    });
    console.log("🎥 GridFSBucket initialized (bucket: videos)");

    return cached.conn;
  } catch (error) {
    dbgr("❌ MongoDB connection Error:", error);
    throw error;
  }
};

// 📌 Getter for GridFS Bucket (after init)
function getBucket() {
  if (!gfsBucket) throw new Error("GridFSBucket not initialized yet");
  return gfsBucket;
}

module.exports = { connectDB, getBucket };
