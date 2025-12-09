const mongoose = require('mongoose');
const course_content = require('./course_content');

const courseSchema = new mongoose.Schema({
    title: String,
    level: String,
    description: String,
    price: Number,
    image:{ 
        type:String,
        default:''
    },
    instructor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Instructor',
        default: null  
    },
    course_content:[{
        type:mongoose.Schema.Types.ObjectId,ref:'CourseContent'
    }],
    image_data: {
        data: Buffer, 
        contentType: String
    },
}, { collection: 'courses' }); 

module.exports = mongoose.model('Course', courseSchema);
