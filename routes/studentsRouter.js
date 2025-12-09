const express=require('express');
const router=express.Router();

const dbgr = require('debug')('development:mongoose');
const mongoose=require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt=require('bcrypt');
const multer=require('multer');
const upload=multer();
const app = express();
const cookieParser = require("cookie-parser");
const path = require('path');
require('dotenv').config();
const Course=require('../models/course-model');
const Bank=require('../models/bank-model');
const User=require('../models/user-model');
const {registerUser,loginUser,loginInstructor}=require('../controllers/authController');
const isLoggedin = require('../middlewares/isLoggedin');
const userModel = require('../models/user-model');
const Transaction = require('../models/transaction-model'); 
const PendingEnrollment=require('../models/pendingEnroll-model');
const CourseContentModel=require('../models/course_content');
const CourseProgress = require('../models/courseProgress-model');
const QuizModel = require('../models/quiz-model');
const QuizSubmissionModel = require('../models/quizSubmisson-model');
const getBucket=require('../config/db');
const pendingCertificateModel = require('../models/pendingCertificate-model');
const certificateModel = require('../models/certificate-model');
const ProgressModel=require('../models/courseProgress-model');


router.get('/signin',(req,res)=>{
        const error=req.query.error;
        res.render('signin',{error});
});

router.post("/signin",loginUser);


router.get('/student_dashboard',isLoggedin,async(req,res)=>{
     try{
    
    const courses = await Course.find({});
    const user=req.user;
    const transactions= await Transaction.find({user_id:user._id});
    const enrolledCourses = [];
    const pendingCourses=[];
    const availableCourses = [];
    const {section,error}=req.query;
    const pendingEnrollments = await PendingEnrollment.find({
    learner_id: user._id,
    status: "pending"
    });

    const enrolledIds = user.coursesEnrolled.map(id => id.toString());
    const pendingIds = pendingEnrollments.map(p => p.course_id.toString());
   
    courses.forEach((course)=>{
       const courseId = course._id.toString();

        if (enrolledIds.includes(courseId)) {
            enrolledCourses.push(course);
        } 
        else if (pendingIds.includes(courseId)) {
            pendingCourses.push(course);
        } 
        else {
            availableCourses.push(course);
        }
    });


    let bank=null;
    if(user.bank_id) bank=await Bank.findById(user.bank_id);

    const approved=await PendingEnrollment.find({
        learner_id:user._id,
        status:"approved",
    }).populate('course_id');

    if (approved.length > 0) {
        await PendingEnrollment.deleteMany({
            learner_id: user._id,
            status: "approved"
        });
    }

    res.render('student_dashboard',{user,enrolledCourses,availableCourses,bank,pendingCourses,approved,transactions,error});

    }catch(err){
        console.log(err);
        res.status(500).send("Server Error");
    }
     
});

router.post('/bank-secret',isLoggedin,async(req,res)=>{
    let user=req.user;
    let{secret}=req.body;
    try{
    const hashedSecret = await bcrypt.hash(secret, 10);
    let bank_account= await Bank.create({
        user_id:user._id,
        secret:hashedSecret
    });
    await User.findByIdAndUpdate(user._id,{
       bank_id:bank_account._id
    });
   res.redirect('/student/student_dashboard');
}catch(err){
    console.log('something went wrong',err);
    res.redirect('/student/student_dashboard?error=something went wrong');
}


});

router.post('/add-balance',isLoggedin,async(req,res)=>{

    const user=req.user;
    let{amount,secret}=req.body;
    const bank= await Bank.findById(user.bank_id);
    const isMatch= await bcrypt.compare(secret,bank.secret);
    if(!isMatch){
        
        return res.redirect('/student/student_dashboard?section=bank&error=Password+not+matched');
    }

    amount = Number(amount);
    if (isNaN(amount) || amount <= 0) {
        return res.redirect('/student/student_dashboard?section=bank&error=amount must be positive'); 
    }
      
    try{
        await Bank.findByIdAndUpdate(user.bank_id,{
        $inc: { balance: amount } 
      });
     return res.redirect('/student/student_dashboard?section=bank');
    }catch(err){
        console.log(err);
        return res.redirect('/student/student_dashboard?section=bank&error=something went wrong');
    }

});


router.post('/update-profile',isLoggedin,upload.single("image"),async(req,res)=>{
    try{
     let user=req.user;
     let {username,email,password}=req.body;
     let updateData={username,email};

     if(password&&password.trim()!==""){
     const hashedPassword= await bcrypt.hash(password,10);
     updateData.password=hashedPassword;
   }

   if(req.file){
    updateData.image={
        data:req.file.buffer,
        contentType:req.file.mimetype
    };
   }
     await userModel.findByIdAndUpdate(user._id,updateData,{new:true});
     res.redirect('/student/student_dashboard?section=profile');
    }catch(err){
       console.log(err);
        return res.redirect('/student/student_dashboard?section=profile&error=something went wrong');
    }


});

router.post('/enroll/:id', isLoggedin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await User.findById(req.user._id).session(session);
        const bank = await Bank.findById(user.bank_id).session(session);
        const course = await Course.findById(req.params.id).session(session);

        if (!course) throw new Error("Course not found!");

        const price = Number(course.price);   
        const { secret } = req.body;

        const isMatch = await bcrypt.compare(secret, bank.secret);
        if (!isMatch) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/student/student_dashboard?section=available&error=Secret Not Matched');
        }

        if (bank.balance < price) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/student/student_dashboard?section=bank&error=Low Bank Balance');
        }

        if (course.instructor_id) {

            await PendingEnrollment.create([{
                learner_id: user._id,
                learner_name: user.username,
                learner_bank_id: user.bank_id,
                course_id: course._id,
                instructor_id: course.instructor_id,
                status: "pending",
                enrollment_date: Date.now()
            }], { session });

            await session.commitTransaction();
            session.endSession();
            return res.redirect('/student/student_dashboard?section=pending');
        }

       
        const adminBank = await Bank.findOneAndUpdate(
            { secret: "LMS_Admin" },
            { $inc: { balance: price } },
            { new: true, session }
        );

        await Bank.findByIdAndUpdate(
            user.bank_id,
            { $inc: { balance: -price } },
            { session }
        );

        if (!user.coursesEnrolled.includes(course._id)) {
            user.coursesEnrolled.push(course._id);
            await user.save({ session });
        }

        await Transaction.create([
            {
                user_type: 'Student',
                user_id: user._id,
                course_id: course._id,
                amount: -price,
                description: `You purchased "${course.title}". $${price} deducted from your account.`
            }
        ], { session });

        await Transaction.create([
            {
                user_type: 'LMS',
                user_id: null,
                course_id: course._id,
                amount: price,
                description: `Student ${user.username} purchased "${course.title}". LMS earned $${price}.`
            }
        ], { session });

        await session.commitTransaction();
        session.endSession();

        return res.redirect('/student/student_dashboard?section=enrolled');

    } catch (err) {
        console.log("Enrollment error:", err);
        await session.abortTransaction();
        session.endSession();
        return res.redirect('/student/student_dashboard?error=Something went wrong');
    }
});


router.get('/course/:id/content', isLoggedin, async (req, res) => {
    try {
        const user = req.user;
        const course_id = req.params.id;

        const course = await Course.findById(course_id);

        if (!course) {
            return res.status(404).send('Course not found');
        }

        const courseContents = await CourseContentModel.find({ course_id: course_id,is_published:true })
            .sort({ order: 1 });

        const contentIds = courseContents.map(c => c._id);
        const progresses = await ProgressModel.find({
            user_id: user._id,
            content_id: { $in: contentIds }
        });

        const progressMap = {};
        progresses.forEach(p => {
            progressMap[p.content_id] = p.watched_seconds;
        });

        const quizzes = await QuizModel.find({ course_id: course_id });

        const quiz_ids = quizzes.map(quiz => quiz._id);
        const submissions = await QuizSubmissionModel.find({
            quiz_id: { $in: quiz_ids },
            user_id: user._id
        });

        const quizzesWithStatus = quizzes.map(quiz => {
            const submission = submissions.find(sub => sub.quiz_id.toString() === quiz._id.toString());
            return {
                ...quiz.toObject(),
                submitted: !!submission,
                submission: submission || null
            };
        }).sort((a, b) => {
            if (!a.submitted && b.submitted) return -1;
            if (a.submitted && !b.submitted) return 1;
            return 0;
        });

        const certificate=await certificateModel.findOne({user_id:user._id,course_id:course_id});

        res.render('course_content', { course, courseContents, user, quizzes: quizzesWithStatus,certificate,progressMap });
    } catch (err) {
        console.error('Error fetching course content:', err);
        res.status(500).send('Server Error');
    }
});

router.post('/applyCertificate/:id',isLoggedin,async(req,res)=>{
   try{
    const course_id=req.params.id;
    const user_id=req.user._id;
    const course=await Course.findById(course_id);
    
    const existing = await pendingCertificateModel.findOne({ course_id, user_id });
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                message: "You have already requested a certificate for this course." 
            });
        }
    let certificate='';
    if(course.instructor_id){
     certificate=await pendingCertificateModel.create({
        course_id,
        user_id
     });

    }else{

    const student = await userModel.findById(user_id);
    const courseContents = await CourseContentModel.find({ course_id:course_id });
    const quizzes = await QuizModel.find({ course_id:course_id });
    const totalDuration = courseContents.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
    
    const [progressList, submissions] = await Promise.all([

             CourseProgress.find({
                user_id: student._id,
                content_id: { $in: courseContents.map(c => c._id) }
                }),

            QuizSubmissionModel.find({
                user_id: student._id,
                quiz_id: { $in: quizzes.map(q => q._id) }
              })
    ]);

    const watchedSeconds = progressList.reduce((sum, p) => sum + (p.watched_seconds || 0), 0);
        let progressPercent = 0;
        if (totalDuration > 0) {
            progressPercent = (watchedSeconds / totalDuration) * 100;
        }
        progressPercent = Math.round(progressPercent * 100) / 100;
        
        const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
        const totalPossible = submissions.reduce((sum, sub) => sum + sub.total, 0);
       
        let averageQuiz = 0;
        if (totalPossible > 0) {
            averageQuiz = (totalScore / totalPossible) * 100;
        }
        averageQuiz = Math.round(averageQuiz * 100) / 100;


        certificate=await pendingCertificateModel.create({
        course_id,
        user_id,
        status:'approved',
        final_score:averageQuiz,
        completion_percent:progressPercent

     });
    }
      
     if(certificate){
        return res.status(200).json({
            success:true,
            message: "Certificate request submitted successfully and is now pending approval." 
        })
     }

    }catch(err){
        console.log(err);
        return res.status(500).json({ 
            success: false, 
            message: "Server error. Please try again later." 
        });
    }


});

router.get("/certificate/:id", async (req, res) => {
    const cert = await certificateModel.findById(req.params.id);

    const pdfBuffer = Buffer.from(cert.pdf_data, "base64");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=certificate.pdf");
    res.send(pdfBuffer);
});



module.exports=router;