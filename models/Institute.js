// models/Institute.js
const mongoose = require('mongoose');

const InstituteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    adminName: { // Stored for signup flow, could be renamed to contactName
        type: String,
    },
    adminEmail: { // Used for Institute Login
        type: String,
        required: true,
        unique: true,
    },
    password: { // Hashed admin password
        type: String,
        required: true,
    },
    // References to Users who have been approved/linked
    linkedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    }],
    groups: [
        {
            groupName: { type: String, required: true },
            users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
        }
    ],
    date: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('institute', InstituteSchema);