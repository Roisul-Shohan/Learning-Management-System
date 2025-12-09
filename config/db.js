// config/db.js
const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");
const { GridFSBucket } = require("mongodb");

let gfsBucket = null;

// 📌 Initialize MongoDB + GridFS
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    dbgr("✅ MongoDB Connected Successfully");

    const conn = mongoose.connection;

    // Initialize GridFSBucket after connection is established
    if (conn.readyState === 1) {
      gfsBucket = new GridFSBucket(conn.db, {
        bucketName: "videos",
      });
      console.log("🎥 GridFSBucket initialized (bucket: videos)");
    } else {
      // Fallback: wait for open event if not ready
      await new Promise((resolve, reject) => {
        conn.once("open", () => {
          gfsBucket = new GridFSBucket(conn.db, {
            bucketName: "videos",
          });
          console.log("🎥 GridFSBucket initialized (bucket: videos)");
          resolve();
        });

        conn.once("error", (err) => {
          reject(err);
        });
      });
    }

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
