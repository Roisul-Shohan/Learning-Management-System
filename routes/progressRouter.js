const express = require("express");
const isLoggedin = require("../middlewares/isLoggedin");
const isInstructor = require("../middlewares/isInstructor");
const router = express.Router();


const CourseProgress = require("../models/courseProgress-model");
const CourseContent = require("../models/course_content");
const QuizModel = require("../models/quiz-model");
const QuizSubmissionModel = require("../models/quizSubmisson-model");
const { getBucket } = require("../config/db");
const mongoose = require("mongoose");


router.post("/", isLoggedin, async (req, res) => {
    try {
        const user_id = req.user._id;
        const { content_id, watched_seconds, completed } = req.body;

        let progress = await CourseProgress.findOne({ user_id, content_id });
    
        progress.watched_seconds =progress.watched_seconds+ watched_seconds;

        if (completed) {
            progress.completed = true;
        }
        progress.last_watched_at = new Date();
        await progress.save();

        return res.json({
            success: true,
            watched_seconds: progress.watched_seconds,
            completed: progress.completed
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});


router.get("/progress/student/:id", isInstructor, async (req, res) => {
    try {
        const user_id = req.params.id;

        const progressList = await CourseProgress.find({ user_id })
            .populate("content_id", "title duration_seconds")
            .sort({ last_watched_at: -1 });

        if (!progressList.length) {
            return res.status(404).json({ success: false, message: "No progress found" });
        }

        return res.json({ success: true, progress: progressList });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get("/student/file/:id", isLoggedin, async (req, res) => {
    try {
        const content = await CourseContent.findById(req.params.id);
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

router.get("/student/video/:id",isLoggedin, async (req, res) => {
    try {
        const content = await CourseContent.findById(req.params.id);
        if (!content || !content.file_id) return res.status(404).send("Video not found");

        if (!mongoose.Types.ObjectId.isValid(content.file_id)) {
            return res.status(400).send("Invalid video ID");
        }

        const bucket = getBucket();
        const file_id = new mongoose.Types.ObjectId(content.file_id);

        const files = await bucket.find({ _id: file_id }).toArray();
        if (!files || files.length === 0) return res.status(404).send("Video file missing");

        const video = files[0];
        const range = req.headers.range;
        const videoSize = video.length;

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Range");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

        const contentType = video.contentType || 'video/mp4';

        if (!range) {
            res.setHeader("Content-Type", contentType);
            res.setHeader("Accept-Ranges", "bytes");
            bucket.openDownloadStream(file_id).pipe(res);
            return;
        }

        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${videoSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize,
            "Content-Type": contentType
        });

        bucket.openDownloadStream(file_id, { start, end })
              .on('error', (err) => {
                  console.error("Stream error:", err);
                  res.status(500).end("Video streaming error");
              })
              .pipe(res);

    } catch (err) {
        console.error("GridFS Stream Error:", err);
        console.error("Error details:", {
            contentId: req.params.id,
            userId: req.user ? req.user._id : 'unknown',
            errorMessage: err.message,
            errorStack: err.stack
        });
        res.status(500).json({
            error: "Video streaming failed",
            message: err.message,
            contentId: req.params.id
        });
    }
});

router.get("/teacher/video/:id",isInstructor, async (req, res) => {
    try {
        const content = await CourseContent.findById(req.params.id);
        if (!content || !content.file_id) return res.status(404).send("Video not found");

        if (!mongoose.Types.ObjectId.isValid(content.file_id)) {
            return res.status(400).send("Invalid video ID");
        }

        const bucket = getBucket();
        const file_id = new mongoose.Types.ObjectId(content.file_id);

        const files = await bucket.find({ _id: file_id }).toArray();
        if (!files || files.length === 0) return res.status(404).send("Video file missing");

        const video = files[0];
        const range = req.headers.range;
        const videoSize = video.length;

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Range");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

        const contentType = video.contentType || 'video/mp4';

        if (!range) {
            res.setHeader("Content-Type", contentType);
            res.setHeader("Accept-Ranges", "bytes");
            bucket.openDownloadStream(file_id).pipe(res);
            return;
        }

        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${videoSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize,
            "Content-Type": contentType
        });

        bucket.openDownloadStream(file_id, { start, end })
              .on('error', (err) => {
                  console.error("Stream error:", err);
                  res.status(500).end("Video streaming error");
              })
              .pipe(res);

    } catch (err) {
        console.error("GridFS Stream Error:", err);
        console.error("Error details:", {
            contentId: req.params.id,
            userId: req.user ? req.user._id : 'unknown',
            errorMessage: err.message,
            errorStack: err.stack
        });
        res.status(500).json({
            error: "Video streaming failed",
            message: err.message,
            contentId: req.params.id
        });
    }
});





module.exports = router;
