const express = require('express');
const {signUpUser, signInUser, patchUser, logout} = require('../controller/userController');
const {verifyAuth} = require('../middleware/authentication');

const {singleUpload} = require('../middleware/uploadMiddleware')


const router = express.Router();


router.post('/signup',singleUpload,signUpUser)
// router.post('/login',signInUser);
router.post('/',signInUser);
router.post('/logout',logout);
router.patch('/update/:userId',verifyAuth,patchUser);
module.exports = router;