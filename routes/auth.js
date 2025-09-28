// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const User = require('../models/User');
const Institute = require('../models/Institute');

// Helper function to sign and send JWT
const getJwtToken = (id, role) => {
    const payload = {
        user: {
            id,
            role, // 'user' or 'institute'
        },
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// =========================================================
// @route   POST api/auth/user/signup
// @desc    Register user
// @access  Public
router.post('/user/signup', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ name, email, password });
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        
        // Generate JWT
        const token = getJwtToken(user.id, 'user');
        res.json({ token });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// =========================================================
// @route   POST api/auth/institute/signup
// @desc    Register institute admin
// @access  Public
router.post('/institute/signup', [
    check('name', 'Institute name is required').not().isEmpty(),
    check('adminEmail', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, adminEmail, password, adminName } = req.body;

    try {
        let institute = await Institute.findOne({ adminEmail });
        if (institute) return res.status(400).json({ msg: 'Institute email already in use' });

        institute = new Institute({ name, adminEmail, password, adminName });
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        institute.password = await bcrypt.hash(password, salt);

        await institute.save();
        
        // Generate JWT
        const token = getJwtToken(institute.id, 'institute');
        res.json({ token });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// =========================================================
// @route   POST api/auth/:role/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/:role/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const role = req.params.role; // 'user' or 'institute'
    const isUser = role === 'user';
    const Model = isUser ? User : Institute;
    const emailField = isUser ? 'email' : 'adminEmail';

    try {
        let entity = await Model.findOne({ [emailField]: email });

        if (!entity) return res.status(400).json({ msg: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, entity.password);

        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });
        
        // Generate JWT
        const token = getJwtToken(entity.id, role);
        res.json({ token, role });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;