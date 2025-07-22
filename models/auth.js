const mongoose = require('mongoose');

const AuthSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        presentationIDs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Presentation'
        }]
    },
    {
        timestamps: true
    }
);


module.exports = mongoose.model('Auth', AuthSchema);
