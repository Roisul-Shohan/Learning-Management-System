const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

let gfsBucket; 

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");

    const conn = mongoose.connection;

    if (conn.readyState === 1) { 
      gfsBucket = new GridFSBucket(conn.db, {
        bucketName: "videos",
      });
      console.log("🎥 GridFSBucket ready (videos)");
    } else {
      await new Promise((resolve) => {
        conn.once("open", () => {
          gfsBucket = new GridFSBucket(conn.db, {
            bucketName: "videos",
          });
          console.log("🎥 GridFSBucket ready (videos)");
          resolve();
        });
      });
    }

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

function getBucket() {
  if (!gfsBucket) {
    throw new Error("GridFSBucket not ready yet");
  }
  return gfsBucket;
}

module.exports = { connectDB, getBucket };
