const express = require('express');
const cors = require('cors');
const connectDb = require('./db/database');
const user = require('./routes/userRoute');
const product = require('./routes/productRoute');
const order = require('./routes/orderRoutes');
const cart = require('./routes/cartRoute');
const store = require('./routes/storeRoute');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser')

const session = require('express-session');
const { verifyAuth,isAdmin } = require('./middleware/authentication');

// Enable CORS
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(session({
    secret: 'MXIUuw6u5Ty0Ecih3XCjZ1+0575N2OTu0x9gsOl6pBc=',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure to true if using HTTPS
}));
require('dotenv').config();
// app.use("/files", express.static(path.join(__dirname, "files")));
app.use("/files", express.static(path.join(__dirname, "files")));

const PORT = process.env.PORT || 3000;



app.use('/', user);
app.use('/', product);
app.use('/carts', cart);
app.use('/orders', order);
app.use('/stores',store);

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});



// for the views
app.get('/signup', (req, res) => {
    res.render('signup');
});
app.get('/add/store', (req, res) => {
    res.render('addStore');
});

app.get('/login', (req, res) => {
    res.render('login');
});
app.get('/stores/nearby',(req,res) => {
    res.render('nearByStore');
})

app.get('/logout', verifyAuth, (req, res) => {
    // Set the JWT cookie's expiration time to a past date
    res.cookie('jwt', '', { expires: new Date(0) });
    
    // Remove the req.user object
    delete req.user;

  
    
    // Redirect the user to the login page
    res.redirect('/login');
});

app.get('/add',verifyAuth,isAdmin,(req,res) => {
    res.render("addproduct");
});

//  for store product add view
app.get('/stores/add/products/:storeId',(req,res) => {
    res.render('addstoreProduct')
})
//  for categories
app.get('/categories',(req,res) => {
    res.render('categories');
})


app.listen(PORT, () => {
    console.log(`Listening on Port ${PORT}`);
    connectDb();
});







