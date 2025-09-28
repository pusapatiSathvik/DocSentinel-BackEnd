const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // These options are often included for modern MongoDB versions
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected successfully.');
    } catch (err) {
        console.error(err.message);
        // Exit process with failure
        process.exit(1); 
    }
};

module.exports = connectDB;