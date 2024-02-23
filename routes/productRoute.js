const express = require("express");
const router = express.Router();
const {addProducts, getProducts, getSpecificProduct, getSpecificBiddingProduct,getStock, updateProduct, patchProducts, getBiddingProducts, addBidding}  = require('../controller/productController');
const { verifyAuth,isAdmin } = require('../middleware/authentication');

const { multipleUpload} = require('../middleware/uploadMiddleware')



router.post('/add',multipleUpload ,verifyAuth, addProducts);


router.get('/',verifyAuth,getProducts);
//  endpoint to get the bidding products
router.get('/bidding',verifyAuth,getBiddingProducts);
router.get('/bidding/:productId',verifyAuth,getSpecificBiddingProduct);
// endpoint to add the bid
router.post('/bid/add/:productId',verifyAuth,addBidding);
router.put('/update/:productId',verifyAuth,isAdmin,updateProduct);
router.get('/stock',verifyAuth,isAdmin,getStock);
router.patch('/quantity-update/:productId',verifyAuth,isAdmin,patchProducts);
router.get('/detail/:productId',verifyAuth,getSpecificProduct);



module.exports=router;
