const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const certificateSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    
     certificate_id: {
        type: String,
        unique: true,
        default: () => uuidv4()
    },
    pdf_data:String,
    final_score: Number,
    completion_percent: Number,
}, { timestamps: true });

certificateSchema.index({ user_id: 1, course_id: 1 }, { unique: true });

module.exports = mongoose.model("Certificate", certificateSchema);
