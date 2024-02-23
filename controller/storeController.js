const asyncHandler = require('express-async-handler');
const path = require('path');
const Store = require('../models/storeModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');

//  controller to add store
const createStore = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  let logo = req.file ? req.file.path : null;
  try {
    const { name, type, latitude, longitude } = req.body;

    const existingUser = await Store.findById(userId);

    if (existingUser) {
      return res.status(401).json({ message: 'User Id already in use' });
    }
    const newStore = new Store({
      name,
      type,
      userId,
      logo: logo || null,
      location: {
        coordinates: [longitude, latitude],
      },
    });
    await newStore.save();
    res.status(200).json({ message: 'Store added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  controller to get all store
const allStore = asyncHandler(async (req, res) => {
  const { search, filter } = req.query;
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const userLocation = req.user.location;
    let stores = await Store.find();

    const searchStores = (stores, search) => {
      return search
        ? stores.filter((store) => store.name.toLowerCase().includes(search))
        : stores;
    };
    // Function to sort products by price
    //   const sortProducts = (products, sort) => {
    //     return sort === 'price'
    //       ? [...products].sort((a, b) => a.price - b.price)
    //       : products;
    //   };

    // Function to filter products by product type
    const filterStores = (stores, filter) => {
      return filter
        ? stores.filter((store) => store.type.toLowerCase() === filter)
        : stores;
    };
    // apply search,sort and filter
    stores = searchStores(stores, search);
    //   products = sortProducts(products, sort);
    stores = filterStores(stores, filter);

    if (stores.length === 0) {
      return res.status(404).json({ message: 'product not available' });
    }

    res.status(200).json(stores);
    //   res.render('products', { products: products, userId: userId ,userRole:userRole ,userLocation});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  controller to add the product to the Store
const addProductToStore = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const storeId = req.params.storeId;

  
  try {
    const {
      title,
      description,
      rating,
      price,
      category,
      type,
      store,
     
      quantity,
      biddingStartTime,
      biddingEndTime,
      
      
    } = req.body;
    //   const store = await Store.findById(userId);
    //   if (!store) {
    //     return res
    //       .status(401)
    //       .json({ error: 'You are not allowed to add product to store' });
    //   }
    let imageFile = req.files ? req.files.map((file) => file.path) : null; // Fix the ternary operator

    const isBidding = type === 'General' ? false : true;

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
      bids: [],
      quantity,
      image: imageFile,
      store, // No need for additional length check
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct); // Corrected status code for created resource
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  later add the filtter to get the store

//  controller for getting product of specific store
const getProductsByStore = asyncHandler(async (req, res) => {
    const storeId = req.params.storeId;
    const userId  = req.user._id;
    const userRole  = req.user.role;
    try {
      // Find the store by ID
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }
  
      // Find all products associated with the store
      const products = await Product.find({ store: storeId }).populate('store');
      const storeUserId = store.userId;
     
      // res.status(200).json({store,products,storeUserId,userId});
    
      res.render('storeDetail',{store,products,userId,userRole,storeUserId});
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


//  controller to get the stores by its categories
const getStoresByCategory = asyncHandler(async (req, res) => {
  try {
    const  type  = req.params.type
    const userRole  = req.user.role;
    const userId = req.user._id;


    // Assuming Store is your Mongoose model
    const stores = await Store.find({ type });

    // res.status(200).json(stores);
    res.render('storeType',{stores,type,userId,userRole})
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

  

//   endpoint to find the store with the aggregration pipeline
const getStoresWithinRadius = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const {search} = req.query;
    try {
      // Extract latitude and longitude from request query
      const latitude = req.user.location.coordinates[1];
      const longitude = req.user.location.coordinates[0];
      
  
      // Ensure latitude and longitude are provided
      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }
  
      // Define the maximum distance (1KM) in meters
      const maxDistance = 1000;
  
      // Perform aggregation pipeline to find stores within 1KM radius of the provided location
      let stores = await Store.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            distanceField: 'distance',
            maxDistance: maxDistance,
            spherical: true
          }
        }
      ]);
      

      const searchStore = (stores,search) => {
        return search
          ? stores.filter((store) => store.name.toLowerCase().includes(search)):stores;
      }

      stores = searchStore(stores,search);
      stores.forEach(store => {
        store.distance = parseFloat(store.distance.toFixed(2));
      });
  
      // res.status(200).json(stores);
      res.render('nearByStore',{stores,userId,userRole});
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
 
  
  

module.exports = { createStore, allStore, addProductToStore,getProductsByStore,getStoresByCategory,getStoresWithinRadius };
