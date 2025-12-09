const dbgr = require('debug')('development:mongoose');
const { execFile } = require('child_process');
const mongoose=require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt=require('bcrypt');
const multer=require('multer');
const upload = require("multer")({ storage: require("multer").memoryStorage() });
const express = require('express');
const cookieParser = require("cookie-parser");
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

// Lazy load ffprobePath to avoid module load failures on Vercel
let ffprobePath = null;
const getFfprobePath = () => {
  if (ffprobePath) return ffprobePath;
  try {
    ffprobePath = require('@ffprobe-installer/ffprobe').path;
    return ffprobePath;
  } catch (err) {
    console.warn('ffprobe binary not available, video duration detection may fail:', err.message);
    return 'ffprobe'; // fallback to system ffprobe
  }
};

const Course=require('../models/course-model');
const Bank=require('../models/bank-model');
const {registerUser,loginUser,loginInstructor}=require('../controllers/authController');
const isLoggedin = require('../middlewares/isLoggedin');
const userModel = require('../models/user-model');
const instructorModel=require('../models/instructor-model');
const Transaction = require('../models/transaction-model'); 
const isInstructor=require('../middlewares/isInstructor');
const pendingEnrollModel = require('../models/pendingEnroll-model');
const bankModel = require('../models/bank-model');
const pendingCertificateModel = require('../models/pendingCertificate-model');
const router=express.Router();
const CourseContentModel=require('../models/course_content');
const CourseProgress = require('../models/courseProgress-model');
const { getBucket } = require("../config/db");
const { Readable } = require('stream');
const courseModel = require('../models/course-model');
const quizModel=require('../models/quiz-model');
const QuizSubmission=require('../models/quizSubmisson-model');


router.get('/instructor_signin',(req,res)=>{
        const error=req.query.error;
        res.render('instructor_signin',{error});
});

router.post("/instructor_signin",loginInstructor);

router.get('/logout',(req,res)=>{
    res.clearCookie('token');
    res.redirect('/instructor/instructor_signin');
});

router.get('/instructor_dashboard',isInstructor,async(req,res)=>{
     const error=req.query.error;
    try{
        const instructor = await instructorModel.findById(req.instructor._id).populate('my_courses');
        const mycourses=instructor.my_courses;
        const lms_courses=await Course.find({ instructor_id: null });
        const courses = mycourses.concat(lms_courses);
        const pendingCourses=await pendingEnrollModel.find({instructor_id:instructor._id,status:'pending'}).populate('course_id');
        const transactions=await Transaction.find({user_id:req.instructor._id});
        const bank=await bankModel.findOne({user_id:req.instructor._id});
        const pendingCertificates=await pendingCertificateModel.find({
            course_id:{$in:courses.map(course=>course._id)},
            status:'pending'
        }).populate('course_id').populate('user_id');
       
        res.render('instructor_dashboard',{mycourses,lms_courses,user:instructor,pendingCourses,transactions,bank,courses,pendingCertificates,error});
      }catch(err){
        console.log("Instructor dashboard error:", err);
        res.render('instructor_dashboard',{error});
      }
      
});

router.post('/create-course', isInstructor, upload.single("image"), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const instructor = req.instructor;
        const { title, level, price, description } = req.body;

        let newCourse = {
            title,
            level,
            price,
            description,
            instructor_id: instructor._id
        };

        if (req.file) {
            newCourse.image_data = {
                data: req.file.buffer,
                contentType: req.file.mimetype
            };
        }

        const course = await Course.create([newCourse], { session });
         
        const instructorDoc = await instructorModel.findById(instructor._id).session(session);
        instructorDoc.my_courses.push(course[0]._id);
        await instructorDoc.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.redirect('/instructor/instructor_dashboard?section=courses');

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.error(err);
        res.redirect('/instructor/instructor_dashboard?section=courses&error=server error');
    }
});

router.post('/update-profile', isInstructor, upload.single("image"), async (req, res) => {
    try {
        const instructor = req.instructor;
        const { username, email, password } = req.body;

        let updateData = { username, email };
        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        if (req.file) {
            updateData.image = {
                data: req.file.buffer,
                contentType: req.file.mimetype
            };
        }

      
        await instructorModel.findByIdAndUpdate(instructor._id, updateData, { new: true });

        res.redirect('/instructor/instructor_dashboard?section=profile');

    } catch (err) {
        console.log("Update instructor profile error:", err);
         res.redirect('/instructor/instructor_dashboard?section=profile&error=server error');
    }
});

router.post('/bank-secret',isInstructor,async(req,res)=>{
    let instructor=req.instructor;
    let{secret}=req.body;
    try{
    const hashedSecret = await bcrypt.hash(secret, 10);
    let bank_account= await Bank.create({
        user_id:instructor._id,
        secret:hashedSecret
    });
    await instructorModel.findByIdAndUpdate(instructor._id,{
       bank_id:bank_account._id
    });
   res.redirect('/instructor/instructor_dashboard');
}catch(err){
    console.log('something went wrong',err);
    res.redirect('/instructor/instructor_dashboard?error=something went wrong');
}


});

router.get('/approve/:id',isInstructor,async(req,res)=>{
    const session=await mongoose.startSession();
    session.startTransaction();
    try{
        const pending=await pendingEnrollModel.findById(req.params.id)
          .populate('course_id').session(session);
        const price=pending.course_id.price;
        const instructorShare=0.85*price;
        const lmsShare=price-instructorShare;
        
        const user_bank=await Bank.findOne({user_id:pending.learner_id});
        if(!user_bank||user_bank.balance<price){
          return  res.redirect(`/instructor/reject/${req.params.id}`);
        }


        await Bank.findOneAndUpdate(
        { user_id: pending.learner_id },
        { $inc: { balance: -price } },
        {session}
        );

        await Bank.findOneAndUpdate(
        { user_id: pending.instructor_id },
        { $inc: { balance: instructorShare } },
        {session}
        );


        await Bank.findOneAndUpdate(
        { secret: "LMS_Admin" },
        { $inc: { balance: lmsShare } },
        {session}
        );
        
        const userTrnx=await Transaction.create([{
            user_type: 'Student',
            user_id: pending.learner_id,
            amount: price,
            course_id: pending.course_id._id,
            description: `You purchased "${pending.course_id.title}" ,Price $${price} deducted from your balance.`
        }],{session}
    );


        const instructorTrnx= await Transaction.create([{
           user_type: 'Instructor',
            user_id: pending.instructor_id,
            amount: instructorShare,
            course_id: pending.course_id._id,
            description: `Student ${pending.learner_name} purchased your course "${pending.course_id.title}". $${instructorShare} added to your account.` 
        }],{session}
    );


       const adminTrnx= await Transaction.create(
       [ {
            user_type: 'LMS',
            user_id: null,
            amount: lmsShare,
            course_id: pending.course_id._id,
            description: `Student ${pending.learner_name} purchased "${pending.course_id.title}". LMS earned $${lmsShare}.`
        }],{session}
        );
        
        pending.status="approved";
        pending.processedAt=Date.now();
        await pending.save({session});
        const user= await userModel.findById(pending.learner_id).session(session);
        user.coursesEnrolled.push(pending.course_id._id);
        await user.save({session});

        const courseContents = await CourseContentModel.find({ course_id: pending.course_id._id }).session(session);
        const progressEntries = courseContents.map(content => ({
            user_id: user._id,
            content_id: content._id,
            watched_seconds: 0,
            completed: false,
            last_watched_at: new Date()
        }));
        await CourseProgress.insertMany(progressEntries,{session});
        await session.commitTransaction();
        session.endSession();

        res.redirect('/instructor/instructor_dashboard?section=enrollments');
    }catch(err){
     console.log(err);
     await session.abortTransaction();
     session.endSession();
     res.redirect('/instructor/instructor_dashboard?section=enrollments&error=somethin went wrong');
}
});

router.post("/add-content", isInstructor, upload.single("file"), async (req, res) => {
   
    const session = await mongoose.startSession();
    session.startTransaction();
   
    try {
        const { course_id, title, description, type, order } = req.body;
        const instructor_id = req.instructor._id;
        const is_published = req.body.is_published ? true : false;

        if (!req.file) {
            await session.abortTransaction();
            session.endSession();
            return res.redirect('/instructor/instructor_dashboard?section=content&error=file is required');
        }
       
        const course = await Course.findById(course_id).session(session);
        if (!course.instructor_id) {
            const contentCount = await CourseContentModel.countDocuments({ course_id }).session(session);
            if (contentCount >= 50) {
                await session.abortTransaction();
                session.endSession();
                return res.redirect('/instructor/instructor_dashboard?section=content&error=Max limit 50 reached')
            }
        }

        const bucket = getBucket();
        if (!bucket) return res.redirect('/instructor/instructor_dashboard?section=content&error=GridFS not initialized');

        const fileName = Date.now() + "-" + req.file.originalname;

    
        const uploadStream = bucket.openUploadStream(fileName, {
            contentType: req.file.mimetype,
            metadata: { contentType: req.file.mimetype }
        });
        uploadStream.end(req.file.buffer);

        uploadStream.on("finish", async () => {
            console.log("✔ File uploaded to GridFS:", uploadStream.id);

            let durationSeconds = 0;
            if (type === 'video') {
                
                const tmpFile = path.join(os.tmpdir(), Date.now() + '-' + req.file.originalname);
                fs.writeFileSync(tmpFile, req.file.buffer);

                execFile(getFfprobePath(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1:nokey=1', tmpFile], (err, stdout) => {
                    if (!err && stdout) {
                        durationSeconds = Math.floor(parseFloat(stdout.trim()));
                    }
                    
                    fs.unlink(tmpFile, () => {});

                    const newContent = new CourseContentModel({
                        course_id,
                        instructor_id,
                        title,
                        description,
                        type,
                        order,
                        is_published,
                        file_id: uploadStream.id,
                        file_name: fileName,
                        file_mimetype: req.file.mimetype,
                        duration_seconds: durationSeconds
                    });

                    newContent.save()
                        .then(async () => {
        
                            const enrolledUsers = await userModel.find({ coursesEnrolled: course_id });
                            const progressEntries = enrolledUsers.map(user => ({
                                user_id: user._id,
                                content_id: newContent._id,
                                watched_seconds: 0,
                                completed: false,
                                last_watched_at: new Date()
                            }));
                            
                            if (progressEntries.length > 0) {
                                await CourseProgress.insertMany(progressEntries).session(session);
                            }
                            const courses=await courseModel.findById(course_id).session(session);
                            courses.course_content.push(newContent._id);
                            await courses.save({session});
                            if(!courses.instructor_id){
                                const price=courses.price*0.015;

                                await bankModel.findOneAndUpdate(
                                    {secret:"LMS_Admin"},
                                    {balance:{$inc:-price}},
                                    { session }
                                );
                                await bankModel.findOneAndUpdate(
                                    {user_id:req.instructor._id},
                                    {balance:{$inc:price}},
                                    { session }
                                );
                                
                                const instructorTx = await Transaction.create([{
                                    user_type: 'Instructor',
                                    user_id: req.instructor._id,
                                    amount: price,
                                    course_id: course_id,
                                    description: `You added content in course "${courses.title}". $${price} added to your account.`
                                }],{ session });

                                const lmsTx = await Transaction.create([{
                                    user_type: 'LMS',
                                    user_id: null,
                                    amount: price,
                                    course_id: pending.course_id._id,
                                    description: `Instructor ${req.instructor.username} added content "${newContent.title}". Balance deducted $${price}.`
                                }],{ session });
 
                                 await Transaction.findByIdAndUpdate(
                                    instructorTx[0]._id,
                                    { $set: { description: `${instructorTx[0].description} | TxID: ${instructorTx[0]._id}` } },
                                    { session }
                                );


                                await Transaction.findByIdAndUpdate(
                                    lmsTx[0]._id,
                                    { $set: { description: `${lmsTx[0].description} | TxID: ${lmsTx[0]._id}` } },
                                    { session }
                                );
                                
                            }

                            await session.commitTransaction();
                            session.endSession();

                           
                            res.redirect(`/instructor/view-details/${course_id}`);    
                        })
                        .catch(async err => {
                            console.error("❌ Error saving content:", err);
                             await session.abortTransaction();
                            session.endSession();
                            return res.redirect("/instructor/instructor_dashboard?section=content&error=content-add-failed");
                        });
                });
            } else {
                // Non-video content
                const newContent = new CourseContentModel({
                    course_id,
                    instructor_id,
                    title,
                    description,
                    type,
                    order,
                    is_published,
                    file_id: uploadStream.id,
                    file_name: fileName,
                    file_mimetype: req.file.mimetype,
                    duration_seconds: 0
                });

              
                await newContent.save({session});

                const courses=await courseModel.findById(course_id).session(session);
                courses.course_content.push(newContent._id);
                await courses.save({session});
               
                if(!courses.instructor_id){
                    
                    const price=courses.price*0.075;

                    await bankModel.findOneAndUpdate({secret:"LMS_Admin"},{
                        balance:{$inc:-price}}, { session }
                    );
                    await bankModel.findOneAndUpdate({user_id:req.instructor._id},{
                         balance:{$inc:price}}, { session }
                    );

                    const instructorTx = await Transaction.create([{
                        user_type: 'Instructor',
                        user_id: req.instructor._id,
                        amount: price,
                        course_id: course_id,
                        description: `You added content in course "${courses.title}". $${price} added to your account.`
                    }], { session });

                    const lmsTx = await Transaction.create([{
                        user_type: 'LMS',
                        user_id: null,
                        amount: price,
                        course_id: pending.course_id._id,
                        description: `Instructor ${req.instructor.username} added content "${newContent.title}". Balance deducted $${price}.`
                    }], { session });

                    await Transaction.findByIdAndUpdate(instructorTx[0]._id,{
                        description:`${instructorTx[0].description} | Transaction Id: ${instructorTx._id} `
                    },{ session });

                     await Transaction.findByIdAndUpdate(lmsTx[0]._id,{
                        description:`${lmsTx[0].description} | Transaction Id: ${lmsTx._id}`
                    },{ session });
                    console.log("✔ LMS transactions completed");
                }

                
                await session.commitTransaction();
                session.endSession();
                console.log("✔ Transaction committed for non-video content");

                res.redirect(`/instructor/view-details/${course_id}`);
            }
        });

        uploadStream.on("error", err => {
            console.error("GridFS upload error:", err);
            return res.redirect("/instructor/instructor_dashboard?section=content?error=upload error");
        });

    } catch (err) {
        console.error(err);
       return res.redirect("/instructor/instructor_dashboard?section=content?error=server error");
    }
});

router.get('/view-details/:id',isInstructor,async(req,res)=>{
    try{
    const user=req.instructor;
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

    res.render('instructor_course_details',{user,course,enrolledStudents: studentsWithProgress,courseContents})
   }catch(err){
    console.log(err);
    res.redirect('/instructor/instructor_dashboard');
   }
});

router.get('/view-file/:id', isInstructor, async (req, res) => {
    try {
        const content = await CourseContentModel.findById(req.params.id);
        if (!content || !content.file_id) return res.status(404).send("File not found");

        if (!mongoose.Types.ObjectId.isValid(content.file_id)) {
            return res.status(400).send("Invalid file ID");
        }

        const bucket = getBucket();
        const file_id = new mongoose.Types.ObjectId(content.file_id);

        const files = await bucket.find({ _id: file_id }).toArray();
        if (!files || files.length === 0) return res.status(404).send("File missing");

        const file = files[0];
        const contentType = file.contentType || content.file_mimetype || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${content.file_name}"`);

        bucket.openDownloadStream(file_id).pipe(res);

    } catch (err) {
        console.error("File streaming error:", err);
        res.status(500).json({
            error: "File streaming failed",
            message: err.message,
            contentId: req.params.id
        });
    }
});

router.post('/toggle-publish/:id', isInstructor, async (req, res) => {
    try {
        const contentId = req.params.id;
        const instructorId = req.instructor._id;

        const content = await CourseContentModel.findOne({
            _id: contentId,
            instructor_id: instructorId
        });

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found or access denied'
            });
        }

        content.is_published = !content.is_published;
        await content.save();

        res.json({
            success: true,
            message: `Content ${content.is_published ? 'published' : 'hidden'} successfully`,
            is_published: content.is_published
        });

    } catch (err) {
        console.error('Toggle publish error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error occurred'
        });
    }
});


router.get('/check-progress/:id', isInstructor, async (req, res) => {
    try {
        const pending = await pendingCertificateModel.findById(req.params.id);
        const student = await userModel.findById(pending.user_id);
        const courseContents = await CourseContentModel.find({ course_id: pending.course_id });
        const quizzes = await quizModel.find({ course_id: pending.course_id });

        const totalDuration = courseContents.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);

        const [progressList, submissions] = await Promise.all([

            CourseProgress.find({
                user_id: student._id,
                content_id: { $in: courseContents.map(c => c._id) }
            }),

            QuizSubmission.find({
                user_id: student._id,
                quiz_id: { $in: quizzes.map(q => q._id) }
            })
        ]);
         
        const watchedSeconds = progressList.reduce((sum, p) => sum + (p.watched_seconds || 0), 0);
        const progressPercent = ((watchedSeconds / totalDuration) * 100).toFixed(2);
        
        const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
        const totalPossible = submissions.reduce((sum, sub) => sum + sub.total, 0);
        const averageQuiz = ((totalScore / totalPossible) * 100).toFixed(2);

        res.json({
            success:true,
            student: student,
            videoProgress: progressPercent,
            quizAverage: averageQuiz
        });

    } catch (err) {
        console.error("Error checking progress:", err);
        res.status(500).send("Server error");
    }
});



router.get('/approve-certificate/:id',isInstructor,async(req,res)=>{
    try{
        const pending=await pendingCertificateModel.findById(req.params.id);
        if(!pending){
            return res.redirect('/instructor/instructor_dashboard?section=certificates');
        }

        const student = await userModel.findById(pending.user_id);
        const courseContents = await CourseContentModel.find({ course_id: pending.course_id });
        const quizzes = await quizModel.find({ course_id: pending.course_id });

        const totalDuration = courseContents.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);

        const [progressList, submissions] = await Promise.all([

            CourseProgress.find({
                user_id: student._id,
                content_id: { $in: courseContents.map(c => c._id) }
            }),

            QuizSubmission.find({
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

        pending.status = 'approved';
        pending.final_score=averageQuiz;
        pending.completion_percent=progressPercent;


        await pending.save();

        res.redirect('/instructor/instructor_dashboard?section=certificates');
    }catch(err){
        console.log(err);
        res.redirect('/instructor/instructor_dashboard?section=certificates');
    }
});

router.get('/reject-certificate/:id',isInstructor,async(req,res)=>{
    try{
        const request=await pendingCertificateModel.findByIdAndDelete(req.params.id);
        if(request){
            request.status = 'rejected';
            await request.save();
        }
        res.redirect('/instructor/instructor_dashboard?section=certificates');
    }catch(err){
        console.log(err);
        res.redirect('/instructor/instructor_dashboard?section=certificates');
    }
});




module.exports=router;