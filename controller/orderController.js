const fs = require('fs').promises;
const path = require('path');
const asyncHandler = require('express-async-handler');
require('dotenv').config();
const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const storeTo = process.env.STORE_TO;
// declare the file path for the orders
const filePath = path.join(__dirname, '../data/orders.json');

//  filepath for the cart
const filePathCart = path.join(__dirname, '../data/carts.json');

const filePathProduct = path.join(__dirname, '../data/products.json');
//  generate random id for the orders

const generateRandomId = () => Math.floor(Math.random() * 1000000);

//  function to read orders from the file
const readOrdersFromFile = async () => {
  try {
    const OrderData = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(OrderData);
  } catch (error) {
    return [];
  }
};

// function to write(create) the orders
const writeOrderToFile = async (orders) => {
  try {
    await fs.writeFile(filePath, JSON.stringify(orders, null, 2), 'utf8');
  } catch (error) {
    return 'Error Occurred';
  }
};

// Function to read the cart data
const readCartsFromFile = async () => {
  try {
    const cartData = await fs.readFile(filePathCart, 'utf-8');
    return JSON.parse(cartData);
  } catch (error) {
    console.log('Error occurred while reading file', error);
    return [];
  }
};
// Function to write the cart data
const writeCartsToFile = async (carts) => {
  try {
    await fs.writeFile(filePathCart, JSON.stringify(carts, null, 2), 'utf8');
  } catch (error) {
    return 'Error Occurred';
  }
};

// function to read the products.json data
const readProductsFromFile = async () => {
  try {
    const productData = await fs.readFile(filePathProduct, 'utf-8');
    return JSON.parse(productData);
  } catch (error) {
    return [];
  }
};


// endpoint for creating orders
const orderProduct = asyncHandler(async (req, res) => {
  try {
    if (storeTo === 'FS') {
      const userId = req.user.id

      const carts = await readCartsFromFile();

      const index = carts.findIndex((cart) => cart.userId === userId);

      if (index === -1) {
        return res.status(404).json({ message: 'No cart Found' });
      }

      // console.log(carts[index]);
      const orderId = generateRandomId();
       // Generate current timestamp
       const timestamp = new Date().toLocaleString();
      //  for the treshold of minimum total price of the cart before checkout
      if (carts[index].total_price < 100) {
        return res
          .status(401)
          .json({ message: 'Cart Total price must be above 100' });
      } else {
        const order = {
          _id: orderId,
          userId,
          products: carts[index].products,
          total_price: carts[index].total_price,
          timestamp:timestamp
        };
        const orders = await readOrdersFromFile();
        orders.push(order);

        await writeOrderToFile(orders);
        // it removes the data from the cart after checkout
        carts.splice(index, 1);
        await writeCartsToFile(carts);

        res.status(200).json(order);
      }
    } else if (storeTo === 'DB') {
      const userId = req.user._id

      // Validate input data
      if (!userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Retrieve the user's cart from the database
      const userCart = await Cart.findOne({ userId });

      if (!userCart) {
        return res.status(404).json({ error: "User's cart not found" });
      }

      // Check the total price threshold
      if (userCart.total_price < 100) {
        return res
          .status(401)
          .json({ message: 'Cart Total price must be above 100' });
      }

      // Create a new order
      const newOrder = new Order({
        userId,
        products: userCart.products,
        total_price: userCart.total_price,
      });

      // Save the order to the database
      const savedOrder = await newOrder.save();

      // Clear the user's cart
      userCart.products = [];
      userCart.total_price = 0;

      // Save the updated user's cart
      await userCart.save();

      // Respond with the saved order
      res.status(201).json(savedOrder);
    } else {
      return res.status(500).json({ error: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




const getOrders = asyncHandler(async (req, res) => {
  try {
    const userRole = req.user.role;
    if (storeTo === 'FS') {
      const userId = req.user.id;
      const orders = await readOrdersFromFile();
      const products = await readProductsFromFile();

      // Filter orders to get all orders for the user
      const userOrders = orders.filter((order) => order.userId === userId);

      // If no orders found, return 404 error
      if (userOrders.length === 0) {
        return res.status(404).json({ message: 'Orders for the user not found!' });
      }

      const purchases = userOrders.map((order) => {
        return {
          _id: order._id,
          userId: order.userId,
          products: order.products.map((item) => {
            const productDetails = products.find((product) => product._id === item.product);
            return {
              product: productDetails ? {
                _id: productDetails._id,
                title: productDetails.title,
                description: productDetails.description,
                price: productDetails.price,
                rating: productDetails.rating,
                quantity: item.quantity,
                image: productDetails.image,
                category: productDetails.category,
                __v: productDetails.__v
              } : {},
              quantity: item.quantity,
              _id: item._id
            };
          }),
          total_price: order.total_price,
          timestamp: order.timestamp
        };
      });

      // res.status(200).json({ purchases, userId });
       res.render('order',{purchases,userId});
    } else if (storeTo === 'DB') {
      // const userId = req.params.userId;
      const userId  = req.user._id;

      // Validate the userId
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
      }

      const purchases = await Order.find({ userId }).populate(
        'products.product'
      ); // Populate product details
      // res.status(200).json({purchases});
      res.render('order',{purchases:purchases,userId,userRole:userRole});
    } else {
      return res.status(500).json({ erorr: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { orderProduct, getOrders };
