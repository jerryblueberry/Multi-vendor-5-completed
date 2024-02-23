const fs = require('fs').promises;
const asyncHandler = require('express-async-handler');
const path = require('path');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');
const saltRounds = 10;
const User = require('../models/userModel'); // userSchema
const { generateTokenAndSetCookie } = require('../utils/generateTokenandSetCookie');
require('dotenv').config();

const storeTo = process.env.STORE_TO;
const filePath = path.join(__dirname, '../data/users.json');

const generateRandomId = () => Math.floor(Math.random() * 1000000);




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



// controller to signupUser (Create Account)
const signUpUser = asyncHandler(async (req, res) => {
  try {
    const { name, email, password,role,longitude,latitude } = req.body;

    if (!name || !email || !password ||!role) {
      return res.status(401).json({ message: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    let profileImage = req.file ? req.file.path:null;

   
    if (storeTo === "FS") {
      const users = await readUsersFromFile();

      const index = users.findIndex((user) => user.email === email);

      if (index !== -1) {
        return res.status(401).json({ message: "Email already exists" });
      }

      const newUser = {
        id: generateRandomId(),
        name,
        email,
        password: hashedPassword,
        role,
        profileImage:profileImage||null
      };
      

      users.push(newUser);
      await writeUsersToFile(users);
      
    } else if (storeTo === "DB") {
      const existingUser = await User.findOne({ email });
      const type = "Point"

      if (existingUser) {
        return res.status(401).json({ message: "Email already exists" });
      }

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role,
        profileImage:profileImage||null,
        location:{
          type,
          coordinates:[longitude,latitude]
        }
      });

      await newUser.save();
    } else {
      return res.status(500).json({ error: "Invalid configuration for storage" });
    }

    // res.status(200).json({ message: "Signup Successful" });
    res.redirect('/login');

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




// controller to signin user(login);
const signInUser = asyncHandler(async(req,res)=> {
  
  
    try {
        const {email,password} = req.body;
        if(!email || !password){
            return res.status(400).json({message:"All Fields are required"});
        }
        let token;

        if(storeTo === "FS"){
            const users   = await readUsersFromFile();
        const index = users.findIndex((user) => user.email === email);
        if(index ===-1){
            return res.status(404).json({message:"User not found"});

        }
        const passwordMatch = await bcrypt.compare(password,users[index].password);

        if(!passwordMatch){
            return res.status(401).json({message:"Password didnot matched"});
        }
        //  token = createToken(users[index].id,users[index].name,users[index].role);

        // //  code for decoding username and id 
        // const decodedToken = jwt.verify(token,'Q$r2K6W8n!jCW%Zk');
        // const userName = decodedToken.userName;       
        // // res.status(200).json({userName});
       


        generateTokenAndSetCookie(users[index].id,users[index].name,res);
        
        
        
       
        res.redirect('/');



        }else if(storeTo === "DB"){
            const user = await User.findOne({email});

            if(!user){
                return res.status(404).json({message:"User not found in the database"});

            }
            const passwordMatch = await bcrypt.compare(password,user.password);
            if(!passwordMatch){
                return res.status(401).json({message:"Invalid Password"});
            }
            generateTokenAndSetCookie(user._id,user.name,user.role,user.location,res);
           
           
            res.redirect('/');
           

          
        }else{
            return res.status(500).json({message:"Invalid storage configuration"});
        }
        // res.status(200).json({token});
      //  res.redirect(`/home?token=${token}`);
    } catch (error) {
        res.status(500).json({error:error.message});
    }
});

//  controller for logout
const logout = asyncHandler(async(req,res)=> {
  try {
    res.cookie('jwt',"",{maxAge:0});
    res.redirect('/');
  } catch (error) {
    
  }
})


// endpoint to update user
const patchUser = asyncHandler(async (req, res) => {
    try {
        
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Name field is required" });
        }

        if (storeTo === "FS") {
            const userId = parseInt(req.params.userId);
            const users = await readUsersFromFile();

            const index = users.findIndex((user) => user.id === userId);
            if (index === -1) {
                return res.status(404).json({ message: "User not found" });
            }

            users[index].name = name;

            await writeUsersToFile(users);
            res.status(200).json({ message: "User updated successfully" });
        } else if (storeTo === "DB") {
            const userId = req.params.userId;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ message: "User not found in the database" });
            }

            user.name = name;

            await user.save();
            res.status(200).json({ message: "User updated successfully" });
        } else {
            return res.status(500).json({ message: "Invalid Storage Configuration" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});





module.exports = { signUpUser,signInUser,patchUser,logout };
