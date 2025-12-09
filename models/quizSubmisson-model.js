const mongoose=require('mongoose');
const quizSubmissionSchema = new mongoose.Schema({
    quiz_id: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    answers: [Number],   
    score: Number,
    total: Number,
}, { timestamps: true });

module.exports = mongoose.model("QuizSubmission", quizSubmissionSchema);
