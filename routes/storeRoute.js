const express = require('express');
const { createStore,getProductsByStore, allStore,addProductToStore,getStoresWithinRadius, getStoresByCategory} = require('../controller/storeController');
const { verifyAuth } = require('../middleware/authentication');
const { singleUploadStore,singleUpload,multipleUpload} = require('../middleware/uploadMiddleware');

const router = express.Router();

// Make sure the field name in your form data matches the field name expected by Multer middleware
router.post('/add', singleUploadStore, verifyAuth, createStore);
router.get('/', verifyAuth, allStore);
router.post('/products/add',multipleUpload,verifyAuth,addProductToStore);
router.get('/nearby',verifyAuth,getStoresWithinRadius);
router.get('/category/:type',verifyAuth,getStoresByCategory);

router.get('/:storeId',verifyAuth,getProductsByStore);


module.exports = router;
