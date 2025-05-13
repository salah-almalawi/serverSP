const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

// Use MONGODB_URI from environment or fallback to localhost
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myprofile';

// Connect to MongoDB
mongoose.connect(uri);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log(`Connected to MongoDB at ${uri}`);
});

module.exports = db;
