const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title:{
        type:String,

    },
    description:{
        type:String,
    },
    price:{
        type:Number,
    },
    rating:{
        type:Number,
    },
    type:{
        type:String,
        enum:["General","Bidding"],
    },
    isBidding:{
        type:Boolean,
        default:false,
    },
    biddingStartTime:{
        type:Date,
    },
    biddingEndTime:{
        type:Date,
    },
    bids:[{
        bidder:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        amount:{
            type:Number
        }
    }],
    quantity:{
        type:Number,
    },
    image:{
        type:[String],
    },
    category:{
        type:String,
    },
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
        required: true // Assuming a product must belong to a store
    }



});

module.exports  = mongoose.model('Product',productSchema);