// models/Document.js

const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    // Reference to the Institute that owns the document
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'institute', // Assuming you have an Institute model
        required: true,
    },
    // Original name of the uploaded file
    originalFileName: {
        type: String,
        required: true,
    },
    // **File Storage Location (Multer will provide this)**
    filePath: {
        type: String,
        required: true,
    },
    // Permissions and Security Settings
    recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'group', // Recipients are groups of users
        required: true,
    }],
    expiryDays: {
        type: Number,
        required: true,
        default: 7, // Default is 7 days
    },
    viewOnce: {
        type: Boolean,
        required: true,
        default: false, // Default is multi-view
    },
    watermark: {
        type: Boolean,
        required: true,
        default: true, // Default is to apply watermark
    },
    uploadDate: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('document', DocumentSchema);