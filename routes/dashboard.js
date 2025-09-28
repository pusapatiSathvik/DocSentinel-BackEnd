// routes/dashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// const auth = (req, res, next) => {
//     console.log('Bypassing auth check for testing.');
//     next();
// };


const User = require('../models/User');
const Institute = require('../models/Institute');
const PendingConnection = require('../models/PendingConnection');

// =========================================================
// USER ROUTES (Requires 'user' role)
// =========================================================

// @route   GET api/dashboard/user/institutes
// @desc    Get connected institutes for the user
// @access  Private (User)


router.get('/user/institutes', auth, async (req, res) => {
    if (req.user.role !== 'user') return res.status(403).json({ msg: 'Forbidden: User access required' });
    
    try {
        // Fetch the user and populate the connectedInstitutes field
        const user = await User.findById(req.user.id).select('-password').populate('connectedInstitutes', ['name', 'adminName', 'adminEmail']);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        
        res.json(user.connectedInstitutes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});




// @route   POST api/dashboard/user/join/:instituteId
// @desc    User requests to join an institute
// @access  Private (User)
router.post('/user/join/:instituteId', auth, async (req, res) => {
    console.log("got a join post req");
    if (req.user.role !== 'user') return res.status(403).json({ msg: 'Forbidden: User access required' });

    try {
        const userId = req.user.id;
        const instituteId = req.params.instituteId;

        // Check if the institute exists
        const institute = await Institute.findById(instituteId);
        if (!institute) return res.status(404).json({ msg: 'Institute not found' });
        
        // 1. Prevent duplicate pending requests
        let existingConnection = await PendingConnection.findOne({ userId, instituteId, status: { $in: ['pending', 'approved','rejected'] } });
        
        if (existingConnection && existingConnection.status === 'approved') {
            return res.status(400).json({ msg: 'You are already linked to this institute.' });
        }
        if (existingConnection && existingConnection.status === 'pending') {
            return res.status(400).json({ msg: 'You already have a pending request for this institute.' });
        }
        if (existingConnection && existingConnection.status === 'rejected') {
        return res.status(403).json({ msg: 'Your request to this institute has been previously rejected. Please contact the administrator.' });
        }

        // 2. Create a new pending connection
        const newConnection = new PendingConnection({ userId, instituteId, status: 'pending' });
        await newConnection.save();

        res.json({ msg: `Request to join ${institute.name} sent successfully. Awaiting approval.` });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



// @route   POST api/dashboard/user/leave/:instituteId
// @desc    Request to leave an institute
// @access  Private (User)
router.post('/user/leave/:instituteId', auth, async (req, res) => {
    if (req.user.role !== 'user') return res.status(403).json({ msg: 'Forbidden: User access required' });

    try {
        const userId = req.user.id;
        const instituteId = req.params.instituteId;

        // 1. Remove institute ID from user's list
        await User.findByIdAndUpdate(userId, { $pull: { connectedInstitutes: instituteId } });

        // 2. Remove user ID from institute's list
        await Institute.findByIdAndUpdate(instituteId, { $pull: { linkedUsers: userId } });

        // 3. Remove from pendingconnections
        await PendingConnection.findOneAndDelete({ userId, instituteId, status: 'approved' }); 

        res.json({ msg: 'Successfully left the institute.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// =========================================================
// INSTITUTE ROUTES (Requires 'institute' role)
// =========================================================


// @route   GET api/dashboard/institute/linked-users
// @desc    Get all linked/approved users for the institute
// @access  Private (Institute)
router.get('/institute/linked-users', auth, async (req, res) => {
    if (req.user.role !== 'institute') return res.status(403).json({ msg: 'Forbidden: Institute access required' });

    try {
        const instituteId = req.user.id;
        
        // Fetch the institute and populate the linkedUsers field
        const institute = await Institute.findById(instituteId)
            .select('linkedUsers')
            .populate({
                path: 'linkedUsers',
                select: 'name email', // Select fields you want to display
            });
            
        if (!institute) return res.status(404).json({ msg: 'Institute not found' });
        
        res.json(institute.linkedUsers);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



// @route   GET api/dashboard/institute/pending
// @desc    Get pending user approval requests
// @access  Private (Institute)
router.get('/institute/pending', auth, async (req, res) => {
    if (req.user.role !== 'institute') return res.status(403).json({ msg: 'Forbidden: Institute access required' });

    try {
        const instituteId = req.user.id;
        // Find pending connections for this institute and populate user details
        const requests = await PendingConnection.find({ instituteId, status: 'pending' })
            .populate('userId', ['name', 'email']); 

        res.json(requests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// @route   GET api/dashboard/institute/rejected
// @desc    Get all users whose requests were rejected
// @access  Private (Institute)
router.get('/institute/rejected', auth, async (req, res) => {
    if (req.user.role !== 'institute') return res.status(403).json({ msg: 'Forbidden: Institute access required' });

    try {
        const instituteId = req.user.id;
        
        // Find connections with status 'rejected'
        const rejectedRequests = await PendingConnection.find({ instituteId, status: 'rejected' })
            .populate('userId', ['name', 'email']); 

        res.json(rejectedRequests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/dashboard/institute/approve/:userId
// @desc    Approve a pending user request
// @access  Private (Institute)
router.put('/institute/approve/:userId', auth, async (req, res) => {
    if (req.user.role !== 'institute') return res.status(403).json({ msg: 'Forbidden: Institute access required' });

    try {
        const userId = req.params.userId;
        const instituteId = req.user.id;

        // 1. Update the pending request status
        const connection = await PendingConnection.findOneAndUpdate(
            { userId, instituteId, status: 'pending' },
            { status: 'approved' },
            { new: true }
        );

        if (!connection) return res.status(404).json({ msg: 'Pending request not found.' });

        // 2. Add user to the institute's linkedUsers list
        await Institute.findByIdAndUpdate(instituteId, { $addToSet: { linkedUsers: userId } });

        // 3. Add institute to the user's connectedInstitutes list
        await User.findByIdAndUpdate(userId, { $addToSet: { connectedInstitutes: instituteId } });

        res.json({ msg: 'User approved and linked successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// @route   PUT api/dashboard/institute/reject/:userId
// @desc    Reject a pending user request
// @access  Private (Institute)
router.put('/institute/reject/:userId', auth, async (req, res) => {
    if (req.user.role !== 'institute') return res.status(403).json({ msg: 'Forbidden: Institute access required' });

    try {
        const userId = req.params.userId;
        const instituteId = req.user.id;

        // 1. Update the pending request status to 'rejected'
        const connection = await PendingConnection.findOneAndUpdate(
            { userId, instituteId, status: 'pending' },
            { status: 'rejected' }, // Set status to rejected
            { new: true }
        );

        if (!connection) return res.status(404).json({ msg: 'Pending request not found.' });
        
        // Optionally, you might delete the connection or keep it for logs

        res.json({ msg: 'User request rejected.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/dashboard/institute/rejected/:userId
// @desc    Admin deletes a rejected request, allowing user to re-apply
// @access  Private (Institute)
router.delete('/institute/rejected/:userId', auth, async (req, res) => {
    if (req.user.role !== 'institute') return res.status(403).json({ msg: 'Forbidden: Institute access required' });

    try {
        const userId = req.params.userId;
        const instituteId = req.user.id;
        
        // Find and delete the specific rejected connection record
        const result = await PendingConnection.findOneAndDelete({ 
            userId, 
            instituteId, 
            status: 'rejected' 
        });

        if (!result) {
            return res.status(404).json({ msg: 'Rejected record not found.' });
        }

        res.json({ msg: 'Rejected record deleted. User is now allowed to submit a new request.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



router.get('/test', auth, (req, res) => {
    res.send('Test route success');
});



module.exports = router;