const fs = require('fs').promises;
const path = require('path');
const User = require('../models/userModel');

const jwt = require('jsonwebtoken');
require('dotenv').config();

const storeTo = process.env.STORE_TO;

const filePath = path.join(__dirname, '../data/users.json');

const readUsersFromFile = async () => {
  try {
    const userData = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(userData);
  } catch (error) {
    return [];
  }
};

const writeUsersToFile = async (users) => {
  try {
    await fs.writeFile(filePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    return error;
  }
};

const verifyAuth = async (req, res, next) => {
  const token = req.cookies.jwt;

  console.log('Received Token', token);

  if (!token) {
    throw new Error("jwt must be provided");
   
    // return res
    //   .status(401)
    //   .json({ message: 'Unauthorized: Token not processed' });
      
  }

  try {
    const decoded = jwt.verify(token, 'MXIUuw6u5Ty0Ecih3XCjZ1+0575N2OTu0x9gsOl6pBc='); // Remove 'Bearer ' prefix
    console.log("decoded",decoded);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    let user;
    if (storeTo === 'FS') {
      const users = await readUsersFromFile();
      
      // user = users.find(u => u.id === decoded.userId); // for fs
      user = users.find(u => u.id === decoded.userId);
      if(!user){
        return res.status(404).json({error:"Didnot found the user"})
      }

      req.user = user;
      // console.log("req.user",user);
    } else if (storeTo === 'DB') {
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      req.user = user;
      console.log("Req User",req.user);
    } else {
      return res.status(500).json({ error: 'Invalid Storage Configuration' });
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Unauthorized token' });
  }
};

const isAdmin = (req, res, next) => {
  console.log('User:', req.user); // Log the user object
  if (req.user.role === 'Admin') {
    next(); // User has the "Admin" role, proceed to the next middleware or route handler
  } else {
    return res
      .status(403)
      .json({ message: 'Forbidden: Only admin can perform this action' });
  }
};


//  middleware to check if the user is seller
const isSeller = (req,res,next) => {
  console.log("User",req.user.role);

  if(req.user.role === "Seller"){
    next();
  }else{
    return res.status(403).json({message:"Forbidden :Only Seller can perform this action"})
  }
}


module.exports = { verifyAuth, isAdmin,isSeller };
