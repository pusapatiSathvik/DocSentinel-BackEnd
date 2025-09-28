// models/PendingConnection.js
const mongoose = require('mongoose');

const PendingConnectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    instituteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'institute',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    requestDate: {
        type: Date,
        default: Date.now,
    },
});

// Ensures a user can only have one pending request to a given institute
PendingConnectionSchema.index({ userId: 1, instituteId: 1 }, { unique: true });

module.exports = mongoose.model('pendingConnection', PendingConnectionSchema);