const dbgr = require('debug')('development:mongoose');
const mongoose=require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const multer=require('multer');
const upload=multer();
const express = require('express');
const app = express();
const cookieParser = require("cookie-parser");
const path = require('path');
require('dotenv').config();
const {connectDB} = require('./config/db');

const userModel = require('./models/user-model');
const quizModel=require('./models/quiz-model');
const instructorModel = require('./models/instructor-model');
const transactionModel = require('./models/transaction-model');
const bankModel=require('./models/bank-model');
const CourseContentModel=require('./models/course_content');
const QuizSubmission=require('./models/quizSubmisson-model');
const CourseProgress=require('./models/courseProgress-model');
const CertificateRequest = require('./models/pendingCertificate-model');
const certificateModel = require('./models/certificate-model');
const generateCertificatePDF = require('./config/pdfDocument');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

(async () => {
  try {
    await connectDB();

    const Course=require('./models/course-model');
    const {registerUser,loginUser,loginInstructor}=require('./controllers/authController');
    const studentsRouter=require('./routes/studentsRouter');
    const instructorsRouter=require('./routes/instructorsRouter');
    const progressRouter=require('./routes/progressRouter');
    const quizRouter=require('./routes/quizRouter');


    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, "public")));
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
    }));

    app.use(flash());
    app.set("view engine", "ejs");
    app.use('/student',studentsRouter);
    app.use('/instructor',instructorsRouter);
    app.use('/progress',progressRouter);
    app.use('/quiz',quizRouter);



    app.get('/', async(req, res) => {
        try{

        const courses = await Course.find({});
        const error=req.query.error;

        res.render("index", { courses ,error});

        }catch(err){
          const error='something went wrong';
          res.render('index',error);
        }
    });


    app.get('/signup', (req, res) => {
        const error=req.query.error;
        res.render("signup",{error});
    });


    app.post('/signup',registerUser);


    app.get('/logout', (req, res) => {
        res.clearCookie('token');
        res.redirect('/student/signin');
    });

    app.post('/admin/login', async (req, res) => {
        try {
            const { password } = req.body;
            if (password === 'aaaaaa') {
                res.cookie('token', 'aaaaaa', { httpOnly: true });
                return res.redirect('/admin_dashboard'); 
            } else {
               
                 res.redirect('/?error=Password not matched'); 
            }

        } catch (err) {
            console.error('Login error:', err);
            res.redirect('/?error=something went wrong');
        }
    });

    app.get('/admin_dashboard',async(req,res)=>{
        
        if(req.cookies.token!=='aaaaaa')return res.redirect('/');
        const {section,error}=req.query;
        const instructors=await instructorModel.find({}).populate('my_courses');
        const students = await userModel.find({})
        .populate({
        path: "coursesEnrolled",
        populate: {
            path: "instructor_id",   
            model: "Instructor"
        }
        });

        const bank=await bankModel.findOne({secret:"LMS_Admin"});
        const courses=await Course.find({});
        const transactions=await transactionModel.find({user_type:"LMS"});

        const certificateRequests =  await CertificateRequest.find({status: "approved"}).populate('user_id').populate('course_id');
            
        res.render('admin_dashboard',{students,instructors,transactions,bank,courses,certificateRequests,error});
    });

    
    app.get('/view-details/:id',async(req,res)=>{
        try{
        if(req.cookies.token!=='aaaaaa') return res.redirect('/');
        const course=await Course.findById(req.params.id);
        const students=await userModel.find({});
        let enrolledStudents=[];
        students.forEach((student)=>{
                if(student.coursesEnrolled.includes(req.params.id)){
                enrolledStudents.push(student);
                }
        });
    
        const courseContents= await CourseContentModel.find({course_id:req.params.id});
        const totalDuration = courseContents.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
        
        const quizzes = await quizModel.find({ course_id: req.params.id });
    
            const studentsWithProgress = await Promise.all(enrolledStudents.map(async (student) => {
                const progressList = await CourseProgress.find({
                    user_id: student._id,
                    content_id: { $in: courseContents.map(c => c._id) }
                });
    
                const watchedSeconds = progressList.reduce((sum, p) => sum + (p.watched_seconds || 0), 0);
                const progressPercent =((watchedSeconds / totalDuration) * 100).toFixed(3);
    
    
                const submissions = await QuizSubmission.find({
                    user_id: student._id,
                    quiz_id: { $in: quizzes.map(q => q._id) }
                });
    
                const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
                const totalPossible = submissions.reduce((sum, sub) => sum + sub.total, 0);
                let averageQuiz = ((totalScore / totalPossible) * 100).toFixed(2); // percentage
                
                return {
                    ...student.toObject(),
                    progressPercent,
                    averageQuiz
                };
            }));
    
        res.render('admin_course_details',{course,enrolledStudents: studentsWithProgress,courseContents})
        }catch(err){
        console.log(err);
        res.redirect('/admin_dashboard');
        }
    });


    app.get('/approve/:id',async(req,res)=>{
        try{

        
         if(req.cookies.token!=='aaaaaa') return res.redirect('/');
         const pending=await CertificateRequest.findById(req.params.id);
         const user_id=pending.user_id;
         const course_id=pending.course_id;
         const final_score=pending.final_score;
         const completion_percent=pending.completion_percent;

        let certificate=await certificateModel.findOne({user_id,course_id});
        if(certificate){
             return res.status(400).json({ 
                success: false, 
                message: "You have already  a certificate for this course." 
            });
        }

        const user=await userModel.findById(user_id);
        const course=await Course.findById(course_id);
        let instructor_name='Admin';
        if(course.instructor_id){
           const instructor= await instructorModel.findById(course.instructor_id);
           instructor_name=instructor.username;
        }
        
        certificate=await certificateModel.create({
            user_id,
            course_id,
            final_score,
            completion_percent
        });

        const pdf=await generateCertificatePDF({
            userName:user.username,
            courseTitle:course.title,
            instructorName:instructor_name,
            directorName:"Shohan",
            certificateId:certificate.certificate_id,
            date:new Date().toLocaleDateString(),
            completionPercent:completion_percent,
            averageQuizScore:final_score
        });

        certificate.pdf_data=pdf;
        await certificate.save();

        await CertificateRequest.findByIdAndDelete(req.params.id);

        res.redirect("/admin_dashboard?section=certificates&approved=true");


        }catch(err){
          console.log(err);
          res.redirect('/admin_dashboard?section=certificate');
        }
    })


    if (!process.env.VERCEL) {
        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    }

  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
})();

module.exports = app;
