const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    logo: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Electronics', 'Grocery', 'Fashion', 'Stationery'],
        required: true
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    verified:{
        type:Boolean,
        default:false,
    }
   
});

// Index the location field for geospatial queries
storeSchema.index({ location: '2dsphere' });

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
