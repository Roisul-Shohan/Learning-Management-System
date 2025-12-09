const mongoose = require('mongoose');

const instructorSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank' },
    my_courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    image: {
        data: Buffer,     
        contentType: String 
    },
});

module.exports = mongoose.model('Instructor', instructorSchema,'instructor');
