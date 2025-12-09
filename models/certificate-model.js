const mongoose = require("mongoose");
const crypto = require("crypto");

const certificateSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    
     certificate_id: {
        type: String,
        unique: true,
        default: () => crypto.randomUUID()
    },
    pdf_data:String,
    final_score: Number,
    completion_percent: Number,
}, { timestamps: true });

certificateSchema.index({ user_id: 1, course_id: 1 }, { unique: true });

module.exports = mongoose.model("Certificate", certificateSchema);
