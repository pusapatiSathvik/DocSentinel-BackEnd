// middleware/auth.js
const jwt = require('jsonwebtoken');

// A safety check to ensure the secret is loaded, 
// although dotenv should handle this in server.js
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET not defined in environment variables.");
    // In a production environment, you might want to throw an error here.
}

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if not token
    if (!token) {
        // Return 401: Unauthorized
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        // This is where the file usually breaks if the package or secret is missing.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the user/institute info and role to the request object
        req.user = decoded.user; 
        next();
    } catch (err) {
        // This handles cases where the token is expired or invalid
        res.status(401).json({ msg: 'Token is not valid' });
    }
};