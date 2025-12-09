const mongoose = require('mongoose');

const PendingEnrollmentSchema = new mongoose.Schema({
    learner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    learner_name: {
        type: String,
        required: true
    },
    learner_bank_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bank',
        required: true
    },
    course_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    instructor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Instructor', 
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date
    }

});

module.exports = mongoose.model('PendingEnrollment', PendingEnrollmentSchema);
