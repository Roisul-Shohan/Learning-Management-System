const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    title: String,
    questions: [
        {
            question: String,
            options: [String],
            correctIndex: Number 
        }
    ],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "Instructor" },
}, { timestamps: true });

module.exports = mongoose.model("Quiz", quizSchema);
