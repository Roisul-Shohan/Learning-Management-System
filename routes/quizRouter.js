const express = require("express");
const router = express.Router();

const QuizModel=require('../models/quiz-model');
const isInstructor = require("../middlewares/isInstructor");
const isLoggedin=require('../middlewares/isLoggedin');
const QuizSubmissionModel=require('../models/quizSubmisson-model');

router.post('/create',isInstructor,async(req,res)=>{
    
     try{
        const {course_id,title,questions}=req.body;

        if (!course_id || !title || !questions || !questions.length) {
            return res.status(400).json({ message: "All fields are required" });
        }  

        const quiz= await QuizModel.create({
            course_id,
            title,
            questions,
            created_by: req.instructor._id
        });

         res.status(201).json({ message: "Quiz created successfully", quiz });

     }catch(err){
        console.log(err);
        res.status(500).json({ message: "Server Error" });
     }
});

router.post('/course/:quizId/submit', isLoggedin, async (req, res) => {
    try {
        const quizId = req.params.quizId;
        const user = req.user;
        const { answers } = req.body; 

        const existingSubmission = await QuizSubmissionModel.findOne({
            quiz_id: quizId,
            user_id: user._id
        });

        if (existingSubmission) {
            return res.status(400).json({ message: 'Quiz already submitted' });
        }

        const quiz = await QuizModel.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        let score = 0;
        quiz.questions.forEach((question, index) => {
            if (answers[index] !== undefined && answers[index] === question.correctIndex) {
                score++;
            }
        });

        const submission = await QuizSubmissionModel.create({
            quiz_id: quizId,
            user_id: user._id,
            answers: answers,
            score: score,
            total: quiz.questions.length
        });

        res.json({
            message: 'Quiz submitted successfully',
            score: score,
            total: quiz.questions.length,
            submission: submission,
            quiz: quiz
        });

    } catch (err) {
        console.error('Error submitting quiz:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const quiz = await QuizModel.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        res.json({ quiz });
    } catch (err) {
        console.error('Error fetching quiz:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;