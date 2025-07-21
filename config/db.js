const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

// Use MONGODB_URI from environment or fallback to localhost
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/SmartPresentation';

// Connect to MongoDB
mongoose.connect(uri);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
    console.log(`Connected to MongoDB at ${uri}`);
    try {
        // Ensure TTL index is created for the TokenBlocklist collection
        await mongoose.model('TokenBlocklist').createIndexes();
        console.log('TokenBlocklist TTL index ensured.');
    } catch (error) {
        console.error('Error creating TTL index for TokenBlocklist:', error);
    }
});

module.exports = db;
