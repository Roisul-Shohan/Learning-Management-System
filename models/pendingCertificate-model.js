const mongoose = require("mongoose");

const certificateRequestSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },

    final_score: Number,
    completion_percent: Number
    
}, { timestamps: true });

module.exports = mongoose.model("CertificateRequest", certificateRequestSchema);
