const mongoose = require('mongoose');
require('dotenv').config();

const TokenBlocklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: process.env.JWT_TOKEN_EXPIRES_IN || '1d'
    }
});

module.exports = mongoose.model('TokenBlocklist', TokenBlocklistSchema);