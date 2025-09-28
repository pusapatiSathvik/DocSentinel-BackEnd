// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    // References to Institutes the user is connected to
    connectedInstitutes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'institute',
    }],
    date: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('user', UserSchema);