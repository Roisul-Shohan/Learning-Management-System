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

    await seedAdminBank();

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

async function seedAdminBank() {
  try {
    const Bank = require("../models/bank-model");
    const existing = await Bank.findOne({ secret: "LMS_Admin" });
    if (!existing) {
      await Bank.create({ user_id: null, balance: 0, secret: "LMS_Admin" });
      console.log("🏦 Seeded admin bank account (LMS_Admin)");
    }
  } catch (err) {
    console.error("⚠️ Failed to seed admin bank:", err.message);
  }
}

function getBucket() {
  if (!gfsBucket) {
    throw new Error("GridFSBucket not ready yet");
  }
  return gfsBucket;
}

module.exports = { connectDB, getBucket };
