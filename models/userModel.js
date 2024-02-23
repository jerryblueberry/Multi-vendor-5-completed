const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["Admin", "User"],
    },
    profileImage: {
        type: String,
    },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
    }
});

// Add 2dsphere index to the location field
userSchema.index({ location: '2dsphere' });

const User = mongoose.model("User", userSchema);
module.exports = User;
