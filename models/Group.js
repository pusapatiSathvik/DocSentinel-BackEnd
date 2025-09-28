// models/Group.js
const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'institute',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    // Users currently assigned to this group
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('group', GroupSchema);