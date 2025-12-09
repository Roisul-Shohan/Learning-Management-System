const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true}, 
    balance: { type: Number, default: 0 },
    secret: { type: String }, 
}, { collection: 'bank' });

module.exports = mongoose.model('Bank', bankSchema);
