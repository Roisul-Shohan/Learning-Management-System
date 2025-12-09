const mongoose = require('mongoose');

const courseContentSchema = new mongoose.Schema({
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  instructor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },

  title: { type: String, required: true },
  description: { type: String, default: '' },

  type: { type: String, enum: ['video', 'pdf', 'slide'], required: true },

  file_name: { type: String, default: null },
  file_mimetype: { type: String, default: null },

  file_id: { type: mongoose.Schema.Types.ObjectId, default: null }, 

  duration_seconds: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  is_published: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'course_contents' });

module.exports = mongoose.model('CourseContent', courseContentSchema);
