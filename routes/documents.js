// routes/documents.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Node's File System module
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth'); // Your authentication middleware
const Document = require('../models/Document');
const Group = require('../models/Group');
const User = require('../models/User');
const Institute = require('../models/Institute');
// const Group = require('../models/Group'); // Needed if you add validation
const JWT_SECRET = process.env.JWT_SECRET_DOCUMENTS
// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Save files to the uploads/documents directory
    },
    filename: (req, file, cb) => {
        // Create a unique filename: fieldname-timestamp-originalfilename.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

// 2. Initialize Multer Upload Middleware
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
    fileFilter: (req, file, cb) => {
        // Accept only PDFs, DOCs, and DOCXs
        const allowedTypes = /pdf|doc|docx/;
        const mimeType = allowedTypes.test(file.mimetype);
        const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimeType && extName) {
            return cb(null, true);
        }
        cb(new Error('File type not supported. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
}).single('document'); // 'document' must match the name used in the frontend FormData append

/**
 * Creates a time-limited, signed JWT containing document and user information.
 * @param {string} documentId - The ID of the uploaded document.
 * @param {string} userId - The ID of the recipient user.
 * @param {number} expiryDays - The number of days until the link expires.
 * @returns {string} The tokenized URL.
 */

const generateSecureLink = (documentId, userId, expiryDays) => {
    const payload = {
        doc: documentId,
        user: userId,
    };
    
    // JWT Expiration: Uses expiryDays from the document settings
    const expiresIn = `${expiryDays}d`;
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn });
    
    // The final secure link structure
    return `/documents/view/${token}`;
};


// 3. POST Route for Upload and Metadata Save
router.post('/upload', auth, (req, res) => {
    // Middleware chain for Multer and Controller logic
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred (e.g., file size limit exceeded)
            return res.status(400).json({ msg: `Multer Error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred (e.g., file type error)
            return res.status(400).json({ msg: err.message });
        }

        // --- File Handling Success: req.file is available ---
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded.' });
        }

        // --- Metadata Save ---
        try {
            // Parse JSON data sent from the frontend FormData
            const { recipients, expiryDays, viewOnce, watermark } = req.body;
            
            // Validate basic inputs
            if (!recipients) {
                 // Clean up file if validation fails
                fs.unlinkSync(req.file.path); 
                return res.status(400).json({ msg: 'Recipient groups are required.' });
            }
            
            // recipients is a JSON string of array IDs from the frontend
            const recipientIds = JSON.parse(recipients); 

            const newDocument = new Document({
                institute: req.user.id, // Assuming auth middleware provides the institute ID
                originalFileName: req.file.originalname,
                // Store the path where Multer saved the file
                filePath: req.file.path, 
                recipients: recipientIds,
                expiryDays: parseInt(expiryDays),
                viewOnce: viewOnce === 'true', // Convert string 'true'/'false' to boolean
                watermark: watermark === 'true',
            });

            await newDocument.save();
            const documentId = newDocument._id;
            
            // ----------------------------------------------------
            // 💡 STEP 4: USER EXTRACTION
            // ----------------------------------------------------
            
            // 1. Find all Group documents that match the recipient IDs
            const groups = await Group.find({ _id: { $in: recipientIds } }).select('members');

            // 2. Flatten and deduplicate the user IDs (unique set of all group members)
            let uniqueUserIds = new Set();
            groups.forEach(group => {
                group.members.forEach(memberId => {
                    uniqueUserIds.add(memberId.toString()); // Convert ObjectId to string for Set
                });
            });
            
            const finalUserIds = Array.from(uniqueUserIds);
            console.log(finalUserIds);
            
            // 3. Get User Details (ID and Email) for link distribution
            const uniqueUsers = await User.find({ _id: { $in: finalUserIds } }).select('_id email name');

            const linksToSend = [];
            
            uniqueUsers.forEach(user => {
                // Generate secure token for THIS specific user and document
                const secureLink = generateSecureLink(documentId, user._id, newDocument.expiryDays);
                
                linksToSend.push({
                    userId: user._id,
                    email: user.email,
                    link: secureLink
                });

                // 💡 FUTURE STEP: Send the email here (using nodemailer, sendgrid, etc.)
                // Example: sendEmail(user.email, newDocument.originalFileName, secureLink);
            });
            
            console.log(`Prepared ${linksToSend.length} unique links for distribution.`);


            return res.json({ 
                msg: 'Document uploaded, metadata saved, and secure links generated.',
                documentId: documentId,
                recipientsCount: linksToSend.length
            });

        } catch (dbError) {
            console.error(dbError.message);
             // CRITICAL: Clean up file if DB save fails
            fs.unlinkSync(req.file.path); 
            return res.status(500).send('Server error during metadata save.');
        }
    });
});
module.exports = router;