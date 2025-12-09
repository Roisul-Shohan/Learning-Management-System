const mongoose=require('mongoose');


const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    image: {
        data: Buffer,     
        contentType: String 
    },
    bank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Bank' }, 
    coursesEnrolled: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
}); 
module.exports = mongoose.model('User', userSchema);
