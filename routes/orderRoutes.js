const express = require('express');
const { verifyAuth,isAdmin } = require('../middleware/authentication');
const { orderProduct, getOrders } = require('../controller/orderController');
const router  = express.Router();



 router.post('/',verifyAuth,orderProduct);
 router.get('/',verifyAuth,getOrders);


 module.exports  = router;