const fs = require('fs').promises;
const asyncHandler = require('express-async-handler');
const schedule = require('node-schedule');
const path = require('path');
require('dotenv').config();
const moment = require('moment');
const Order = require('../models/orderModel');


const Product = require('../models/productModel');

const storeTo = process.env.STORE_TO;
const filePath = path.join(__dirname, '../data/products.json');

const generateRandomId = () => Math.floor(Math.random() * 10000000);

const readProductsFromFile = async () => {
  try {
    const productData = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(productData);
  } catch (error) {
    return [];
  }
};

const writeProductsToFile = async (products) => {
  try {
    await fs.writeFile(filePath, JSON.stringify(products, null, 2), 'utf8');
  } catch (error) {
    return error;
  }
};

// endpoint to add products
const addProducts = asyncHandler(async (req, res) => {
  try {
    const {
      title,
      description,
      rating,
      price,
      category,
      type,
      
      quantity,
      biddingStartTime,
      biddingEndTime,
    } = req.body;
    if (!title || !description || !rating || !price || !category || !quantity) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    let imageFile = req.files ? req.files.map((file) => file.path) : [];

    if (storeTo === 'FS') {
      const products = await readProductsFromFile();

      const productId = generateRandomId();

      const newProduct = {
        _id: productId,
        title,
        price,
        description,
        quantity,
        category,
        rating,
        image: imageFile.length > 0 ? imageFile : null,
      };
      products.push(newProduct);
      await writeProductsToFile(products);

      // res.status(200).json(newProduct);
      res.redirect('/products');
    } else if (storeTo === 'DB') {
      type ==="General"? isBidding=false:isBidding=true;
     
      const newProduct = new Product({
        title,
        description,
        rating,
        category,
        price,
        isBidding,
        type,
        biddingStartTime: isBidding ? biddingStartTime : undefined,
        biddingEndTime: isBidding ? biddingEndTime : undefined,
        bids:[],
        quantity,
        image: imageFile.length > 0 ? imageFile : null,
      });

      const savedProduct = await newProduct.save();
      // res.status(200).json(savedProduct);
      res.redirect('/');
    } else {
      return res.status(500).json({ message: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Function to calculate the time remaining in a human-readable format
const calculateTimeRemaining = (endTime) => {
  const now = moment(); // Get the current time
  const end = moment(endTime); // Get the bidding end time

  // Calculate the difference between now and the end time
  const duration = moment.duration(end.diff(now));

  // Get the remaining days, hours, minutes, and seconds
  const days = duration.days();
  const hours = duration.hours();
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  // Format the remaining time
  let remainingTime = '';
  if (days > 0) {
    remainingTime += `${days} days `;
  }
  if (hours > 0) {
    remainingTime += `${hours} hours `;
  }
  if (minutes > 0) {
    remainingTime += `${minutes} minutes `;
  }
  if (seconds > 0) {
    remainingTime += `${seconds} seconds`;
  }

  return remainingTime.trim();
};



//  endpoint to get bidding products
const getBiddingProducts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole  = req.user.role;
  
  try {
    // Retrieve all bidding products with populated bids including bidder's username
    const biddingProducts = await Product.find({ isBidding: true }).populate({
      path: 'bids',
      populate: {
        path: 'bidder',
        select: 'name'
      }
    });

    // Iterate through each bidding product to find the highest bidder and highest bid amount
    const productsWithHighestBid = biddingProducts.map(product => {
      const highestBid = product.bids.reduce((maxBid, bid) => {
        return bid.amount > maxBid.amount ? bid : maxBid;
      }, { amount: product.price });
      const remainingTime = calculateTimeRemaining(product.biddingEndTime);

      const highestBidder = highestBid.bidder ? highestBid.bidder.name : 'Unknown';

      // Modify the structure to include highestBidderName below highestBid
      return {
        ...product.toObject(),
        highestBid: highestBid.amount,
        highestBidder: highestBidder,
        remainingTime:remainingTime
      };
    });

    // res.status(200).json(productsWithHighestBid);
    res.render('bidding',({products:productsWithHighestBid,userRole,userId}));
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});



const getSpecificBiddingProduct = asyncHandler(async (req, res) => {
  const productId = req.params.productId; // Assuming you're passing the product ID as a route parameter

  try {
    // Retrieve the specific product with populated bids including bidder's username
    const product = await Product.findById(productId).populate({
      path: 'bids',
      populate: {
        path: 'bidder',
        select: 'name'
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the highest bid for the product
    const highestBid = product.bids.reduce((maxBid, bid) => {
      return bid.amount > maxBid.amount ? bid : maxBid;
    }, { amount: product.price }); // Start with the product's price as the default highest bid

    // Get remaining time for bidding
    const remainingTime = calculateTimeRemaining(product.biddingEndTime);

    // Determine the highest bidder's name
    const highestBidder = highestBid.bidder ? highestBid.bidder.name : 'be the first one to bid';

    // Construct the response object with highest bid information
    const productWithHighestBid = {
      ...product.toObject(),
      highestBid: highestBid.amount,
      highestBidder: highestBidder,
      remainingTime: remainingTime
    };

    // res.status(200).json(productWithHighestBid);
    res.render('biddetail', {product:productWithHighestBid});
    console.log(product);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});




// Function to update the bidding status of products
const updateBiddingStatus = async () => {
  try {
    // Find all products where isBidding is true and biddingEndTime has passed
    const productsToUpdate = await Product.find({ isBidding: true, biddingEndTime: { $lt: new Date() } });

    // Update isBidding field to false for these products
    await Promise.all(productsToUpdate.map(async (product) => {
      product.isBidding = false;
      await product.save();

      // If there are bids for this product
      if (product.bids.length > 0) {
        // Get the highest bid
        const highestBid = product.bids.reduce((maxBid, bid) => {
          return bid.amount > maxBid.amount ? bid : maxBid;
        }, { amount: product.price });

        // Create a new order with the highest bidder and the product
        const newOrder = new Order({
          userId: highestBid.bidder,
          products: [{ product: product._id, quantity: 1 }],
          total_price: highestBid.amount,
        });

        // Save the new order
        await newOrder.save();
      }
    }));

    console.log('Bidding status updated successfully.');
  } catch (error) {
    console.error('Error updating bidding status:', error);
  }
};

// Schedule the updateBiddingStatus function to run every minute (adjust as needed)
 schedule.scheduleJob('* * * * *', updateBiddingStatus);

//  endpoint to post the bidding for product
const addBidding = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
      const {  amount } = req.body;
      const productId = req.params.productId;

      // Retrieve the product from the database
      const product = await Product.findById(productId);

      if (!product) {
          return res.status(404).json({ message: 'Product not found' });
      }

      // Find the user's existing bid for the product
      const existingBidIndex = product.bids.findIndex(bid => bid.bidder.toString() === userId);

      // If the user has already placed a bid, update the existing bid's amount
      if (existingBidIndex !== -1) {
          product.bids[existingBidIndex].amount = amount;
      } else {
          // Check if the bid amount is higher than the current highest bid or the initial price
          const highestBidAmount = product.bids.length > 0 ? Math.max(...product.bids.map(bid => bid.amount)) : product.price;
          if (amount <= highestBidAmount) {
              return res.status(400).json({ message: 'Bid amount must be higher than the current highest bid or initial price' });
          }

          // Record the bid with the bidder's user ID and amount
          product.bids.push({ bidder: userId, amount });
      }

      await product.save();

      // res.status(200).json({ message: 'Bid placed successfully' });
      res.redirect(`/bidding/${productId}`);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// function for the calculating time remaining


// endpoint to get the products with the query
const getProducts = asyncHandler(async (req, res) => {
  const { search, sort, filter } = req.query;

  try {
    if (storeTo === 'FS') {
      const userId = req.user.id;
      const userRole = req.user.role;
      let products = await readProductsFromFile();

      const searchProducts = (products, search) => {
        return search
          ? products.filter(
              (product) =>
                product.title.toLowerCase().includes(search) ||
                product.description.toLowerCase().includes(search)
            )
          : products;
      };
      const sortProducts = (products, sort) => {
        if (sort === 'price-low') {
          return [...products].sort((a, b) => b.price - a.price); // Sort in descending order for 'price-low'
        } else if (sort === 'price-high') {
          return [...products].sort((a, b) => a.price - b.price); // Sort in ascending order for 'price-high'
        } else {
          return products; // Return original products array if sort is not specified or is invalid
        }
      };
      

      const filterProducts = (products, filter) => {
        return filter
          ? products.filter(
              (product) => product.category.toLowerCase() === filter
            )
          : products;
      };

      products = searchProducts(products, search);
      products = sortProducts(products, sort);
      products = filterProducts(products, filter);

      if (products.length === 0) {
        return res.status(404).json({ message: 'Products not found' });
      }
      res.render('products', { products: products, userId: userId });
    } else if (storeTo === 'DB') {
      const userId = req.user._id;
      const userRole = req.user.role;
      const userLocation = req.user.location;
      let products = await Product.find();

      const searchProducts = (products, search) => {
        return search
          ? products.filter(
              (product) =>
                product.title.toLowerCase().includes(search) ||
                product.description.toLowerCase().includes(search)
            )
          : products;
      };
      // Function to sort products by price
      const sortProducts = (products, sort) => {
        if (sort === 'price-low') {
          return [...products].sort((a, b) => a.price - b.price); // Sort in descending order for 'price-low'
        } else if (sort === 'price-high') {
          return [...products].sort((a, b) => b.price - a.price); // Sort in ascending order for 'price-high'
        } else {
          return products; // Return original products array if sort is not specified or is invalid
        }
      };
      

      // Function to filter products by product type
      const filterProducts = (products, filter) => {
        return filter
          ? products.filter(
              (product) => product.category.toLowerCase() === filter
            )
          : products;
      };
      // apply search,sort and filter
      products = searchProducts(products, search);
      products = sortProducts(products, sort);
      products = filterProducts(products, filter);

      if (products.length === 0) {
        return res.status(404).json({ message: 'product not available' });
      }

      // res.status(200).json(products);
      res.render('products', { products: products, userId: userId ,userRole:userRole ,userLocation});
    } else {
      return res.status(500).json({ message: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// endpoint to  get specific products
const getSpecificProduct = asyncHandler(async (req, res) => {
  try {
    if (storeTo === 'FS') {
      const userId = req.user.id;
      const productId = parseInt(req.params.productId);
      const products = await readProductsFromFile();

      const index = products.findIndex((product) => product._id === productId);
      if (index === -1) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // res.status(200).json(products[index]);
      res.render('productdetail', { userId, product: products[index] });
    } else if (storeTo === 'DB') {
      const userId = req.user._id;
      const userRole = req.user.role;
      const productId = req.params.productId;
      const product = await Product.findById(productId).populate('store');
      if (!product) {
        return res.status(404).json({ error: 'Product Not Found' });
      }
      res.render('productdetail', { userId, product,userRole });
      // res.status(200).json(product);
    } else {
      return res.status(500).json({ message: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  end point to get the out of stock products
const getStock = asyncHandler(async (req, res) => {
  try {
    if (storeTo === 'FS') {
      const products = await readProductsFromFile();
      const outOfStock = products.filter((product) => product.quantity < 5);
      res.status(200).json(outOfStock);
    } else if (storeTo === 'DB') {
      const outOfStock = await Product.find({ quantity: { $lt: 5 } });
      res.status(200).json(outOfStock);
    } else {
      return res.status(500).json({ message: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// endpoint to update all the fields using put
const updateProduct = asyncHandler(async (req, res) => {
  const { title, description, price, quantity, category, rating } = req.body;

  try {
    if (storeTo === 'FS') {
      const productId = parseInt(req.params.productId);
      const products = await readProductsFromFile();
      const index = products.findIndex((product) => product.id === productId);

      if (index === -1) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const updatedProduct = {
        title,
        description,
        price,
        quantity,
        category,
        rating,
      };
      products[index] = { ...products[index], ...updatedProduct };
      await writeProductsToFile(products);

      res
        .status(201)
        .json({ message: 'Product Updated Successfully', updatedProduct });
    } else if (storeTo === 'DB') {
      const productId = req.params.productId;
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        {
          title,
          description,
          price,
          category,
          rating,
          quantity,
        },
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res
        .status(200)
        .json({ message: 'Product Updated Successfully', updatedProduct });
    } else {
      return res.status(500).json({ message: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// endpoint to patch the products quantity
const patchProducts = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  try {
    if (storeTo === 'FS') {
      const productId = parseInt(req.params.productId);

      const products = await readProductsFromFile();
      const index = products.findIndex((product) => product.id === productId);

      if (index === -1) {
        return res.status(404).json({ message: 'Product Not found' });
      }
      products[index].quantity = quantity;
      await writeProductsToFile(products);
      res
        .status(200)
        .json({
          message: 'Product Quantity Updated',
          product: products[index],
        });
    } else if (storeTo === 'DB') {
      const productId = req.params.productId;

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        {
          quantity,
        },
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res
        .status(200)
        .json({ message: 'Product Quantity updated', product: updatedProduct });
    } else {
      return res.status(500).json({ message: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  addProducts,
  getBiddingProducts,
  addBidding,
  getProducts,
  getSpecificProduct,
  getStock,
  updateProduct,
  patchProducts,
  getSpecificBiddingProduct,
};
