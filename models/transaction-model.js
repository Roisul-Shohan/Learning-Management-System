const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user_type: { type: String, enum: ['Student', 'Instructor', 'LMS'], required: true },
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'user_type'
  },
  amount: { type: Number, required: true },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, 
  description: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
