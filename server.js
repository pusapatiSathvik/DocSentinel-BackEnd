// server.js
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

// Connect Database
connectDB();

const app = express();

// Init Middleware
app.use(express.json({ extended: false })); // Allows us to get data in req.body
app.use(cors()); // Allow cross-origin requests from the React frontend

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard')); // Protected routes

// Simple default route
app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
console.log('Express comes from:', require.resolve('express'));
