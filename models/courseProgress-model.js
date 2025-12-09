const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseContent', required: true },
  watched_seconds: { type: Number, default: 0 },  
  completed: { type: Boolean, default: false },
  last_watched_at: { type: Date, default: Date.now }
}, { collection: 'course_progress' });


module.exports = mongoose.model('CourseProgress', courseProgressSchema);
