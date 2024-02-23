const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number, default: 1 },
      price: { type: Number },
    },
  ],
  total_price: {
    type: Number,
    default: 0,
  },
});

module.exports =  mongoose.model('Cart',cartSchema);
