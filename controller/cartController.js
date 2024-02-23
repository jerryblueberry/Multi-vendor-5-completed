const fs = require('fs').promises;
const path = require('path');
const asyncHandler = require('express-async-handler');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
require('dotenv').config();

const storeTo = process.env.STORE_TO;
// declare the filepath
const filePath = path.join(__dirname, '../data/carts.json');

// declare the filepath for Products
const filePathProduct = path.join(__dirname, '../data/products.json');

// Generate randomId for the cart item
const generateRandomId = () => Math.floor(Math.random() * 100000);

// function to read the cart data
const readCartsFromFile = async () => {
  try {
    const cartData = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(cartData);
  } catch (error) {
    return [];
  }
};

// function to write in the cart data
const writeCartsToFile = async (carts) => {
  await fs.writeFile(filePath, JSON.stringify(carts, null, 2), 'utf8');
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

// function to add to cart
const addCart = asyncHandler(async (req, res) => {
  try {
    const { product, quantity, price } = req.body;

    if (storeTo === 'FS') {
      const userId = req.user.id;
      let carts = await readCartsFromFile();

      const index = carts.findIndex((cart) => cart.userId === userId);
      const cartId = generateRandomId();

      let newCart;

      if (index === -1) {
        // It means the user does not have a cart
        // Create a new one
        newCart = {
          _id: cartId,
          userId,
          products: [{ product, quantity, price, _id: generateRandomId() }], // Include _id field for each product
          total_price: 0, // Set total_price to 0
        };
        carts.push(newCart);
      } else {
        const existingProductIndex = carts[index].products.findIndex(
          (item) => item.product === product
        );

        if (existingProductIndex !== -1) {
          // If the product already exists, update the quantity
          carts[index].products[existingProductIndex].quantity += parseInt(
            quantity
          );
        } else {
          // If the product doesn't exist, add it to the cart with the specified quantity
          carts[index].products.push({
            product,
            quantity: parseInt(quantity),
            price,
            _id: generateRandomId(), // Include _id field for the new product
          });
        }
        newCart = carts[index];
      }

      const products = await readProductsFromFile();

      // Calculate the total price
      newCart.total_price = products.reduce((total, product) => {
        const cartProduct = newCart.products.find(
          (p) => p && p.product === product._id
        );
        const productPrice =
          typeof product.price === 'number'
            ? product.price
            : parseFloat(product.price);
        

        return (
          total +
          productPrice *
            (cartProduct && cartProduct.quantity ? cartProduct.quantity : 0)
        );
      }, 0);
     

      console.log('new cart', newCart);

      await writeCartsToFile(carts);

      // Send the response with the modified newCart object
      res.status(200).json({ userCart: newCart });
      // res.redirect('/carts');
    } else if (storeTo === 'DB') {
      const userId = req.user._id;
      let userCart = await Cart.findOne({ userId });

      if (!userCart) {
        userCart = new Cart({
          userId,
          products: [{ product, quantity, price }],
          total_price: 0,
        });
      } else {
        // check if product already exits in the cart
        const existingProductIndex = userCart.products.findIndex(
          (item) => item.product.toString() === product.toString()
        );

        if (existingProductIndex !== -1) {
          userCart.products[existingProductIndex].quantity += 1;
        } else {
          // if the product does not exist, add it to the cart with specified quantity;
          userCart.products.push({ product, quantity, price });
        }
      }
      // calculate the total_price
      const products = await Product.find({
        _id: { $in: userCart.products.map((p) => p.product) },
      });

      userCart.total_price = products.reduce((total, product) => {
        const cartProduct = userCart.products.find(
          (p) => p.product.toString() === product._id.toString()
        );
        const productPrice =
          typeof product.price === 'number'
            ? product.price
            : parseFloat(product.price);

        return total + productPrice * cartProduct.quantity;
      }, 0);

      const savedCart = await userCart.save();

      // res.redirect('/carts');
      res.status(200).json({userCart});
    } else {
      return res.status(500).json({ message: 'Invalid Storage Configuration' });
    }

    // Find the user's carts or create a new array if it does not exist
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//  endpoint to get the user cart detail
const getCart = asyncHandler(async (req, res) => {
  try {
    const userRole = req.user.role;
    if (storeTo === 'FS') {
      const userId = req.user.id;
      const carts = await readCartsFromFile();
      const products = await readProductsFromFile();

      const index = carts.findIndex((cart) => cart.userId === userId);
      if (index === -1) {
        return res.status(404).json({ message: 'Empty Cart' });
      }

      const populatedCart = {
        ...carts[index],
        products: carts[index].products.map((item) => {
          const productDetails = products.find((product) => product._id === item.product);
          return {
            product: productDetails ? {
              _id: productDetails._id,
              title: productDetails.title,
              description: productDetails.description,
              price: productDetails.price,
              rating: productDetails.rating,
              quantity: productDetails.quantity,
              image: productDetails.image,
              category: productDetails.category,
              __v: productDetails.__v
            } : {},
            quantity: item.quantity,
            price: item.price,
            _id: item._id
          };
        }),
      };
      

      // res.status(200).json({ userCart: populatedCart });
      res.render('cart', { userCart: populatedCart });
    } else if (storeTo === 'DB') {
      const userId = req.user._id;
      // const userId = req.params.userId;
      const userCart = await Cart.findOne({ userId }).populate(
        'products.product'
      );

      if (!userCart) {
        return res.status(404).json({ message: 'Cart not found' });
      }
      res.render("cart",{userCart:userCart,userRole:userRole});
      // res.status(200).json({ userCart });
    } else {
      return res.status(500).json({ message: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// endpoint for the increament of the product quantity
const cartIncreament = asyncHandler(async (req, res) => {
  const { product } = req.body;

  try {
    if (storeTo === 'FS') {
      const userId = req.user.id;
      // const userId = parseInt(req.params.userId);
      let carts = await readCartsFromFile();

      const index = carts.findIndex((cart) => cart.userId === userId);

      if (index !== -1) {
        const existingProductIndex = carts[index].products.findIndex(
          (item) => item.product.toString() === product.toString()
        );

        if (existingProductIndex !== -1) {
          // Update the quantity of the existing product
          carts[index].products[existingProductIndex].quantity += 1;

          // Update the total price based on the updated products
          carts[index].total_price = carts[index].products.reduce(
            (total, product) => total + product.price * product.quantity,
            0
          );

          // Write the entire carts array to the file
          await writeCartsToFile(carts);

          res.status(200).json(carts[index]);
        } else {
          res.status(404).json({ error: 'Product not found in the cart' });
        }
      } else {
        res.status(404).json({ error: 'Cart not found for the user' });
      }
    } else if (storeTo === 'DB') {
      // const userId = req.params.userId;
      const userId = req.user._id;
      let userCart = await Cart.findOne({ userId });

      if (userCart) {
        const existingProduct = userCart.products.find(
          (item) => item.product.toString() === product.toString()
        );

        if (existingProduct) {
          existingProduct.quantity += 1;
          userCart = await userCart.save();
          await updateCartTotal(userCart);
          res.status(200).json(userCart);
        } else {
          res.status(404).json({ message: 'product not found in cart' });
        }
      } else {
        res.status(401).json({ message: 'Cart not found for the user' });
      }
    } else {
      return res.status(500).json({ message: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// endpoint for cart decreament
const cartDecreament = asyncHandler(async (req, res) => {
  const { product } = req.body;

  try {
    if (storeTo === 'FS') {
      const userId = req.user.id;
      let carts = await readCartsFromFile();
      const index = carts.findIndex((cart) => cart.userId === userId);

      if (index !== -1) {
        const existingProductIndex = carts[index].products.findIndex(
          (item) => item.product.toString() === product.toString()
        );

        if (existingProductIndex !== -1) {
          if (carts[index].products[existingProductIndex].quantity <= 1) {
            return res.json({
              message:
                'Quantity cannot be less than 1 Instead try Removing it!',
            });
          }
          carts[index].products[existingProductIndex].quantity -= 1;

          carts[index].total_price = carts[index].products.reduce(
            (total, product) => total + product.price * product.quantity,
            0
          );

          await writeCartsToFile(carts);

          res.status(200).json(carts[index]);
        } else {
          res.status(404).json({ message: 'Product not found' });
        }
      } else {
        res.status(404).json({ message: 'Cart not found for the user' });
      }
    } else if (storeTo === 'DB') {
      // const userId = req.params.userId;
      const userId = req.user._id;
      let userCart = await Cart.findOne({ userId });

      if (userCart) {
        const existingProduct = userCart.products.find(
          (item) => item.product.toString() === product.toString()
        );

        if (existingProduct) {
          if (existingProduct.quantity <= 1) {
            return res
              .status(400)
              .json({
                message: 'Product cannot be less than 1 try removing instead',
              });
          } else {
            existingProduct.quantity -= 1;
            userCart = await userCart.save();
            await updateCartTotal(userCart);
            res.status(200).json(userCart);
          }
        } else {
          res.status(404).json({ error: 'Product not found' });
        }
      } else {
        res.status(404).json({ error: 'No cart exists for the user' });
      }
    } else {
      return res.status(500).json({ message: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// endpoint to remove specific product
const removeProduct = asyncHandler(async (req, res) => {
  const { product } = req.body;

  try {
    if (storeTo === 'FS') {
      const userId = req.user.id;
      // const userId  = parseInt(req.params.userId);

      let carts = await readCartsFromFile();
      const index = carts.findIndex((cart) => cart.userId === userId);

      if (index !== -1) {
        const productIndex = carts[index].products.findIndex(
          (item) => item.product.toString() === product.toString()
        );

        if (productIndex !== -1) {
          carts[index].products.splice(productIndex, 1);
          carts[index].total_price = carts[index].products.reduce(
            (total, product) => total + product.price * product.quantity,
            0
          );
          await writeCartsToFile(carts);
          res.status(200).json(carts);
        } else {
          res.status(404).json({ error: 'product not found in the cart' });
        }
      } else {
        res.status(404).json({ error: 'Cart Not found for the user' });
      }
    } else if (storeTo === 'DB') {
      // const userId = req.params.userId;
      const userId = req.user._id;
      let userCart = await Cart.findOne({ userId });

      if (userCart) {
        const productIndex = userCart.products.findIndex(
          (item) => item.product.toString() === product.toString()
        );

        if (productIndex !== -1) {
          userCart.products.splice(productIndex, 1);
          await updateCartTotal(userCart);

          userCart = await userCart.save();
          res.status(200).json(userCart);
        } else {
          res.status(404).json({ error: 'Product not found in the cart' });
        }
      } else {
        res.status(404).json({ error: 'Cart not found for the given user' });
      }
    } else {
      return res.status(500).json({ erorr: 'Invalid Storage Configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const updateCartTotal = async (userCart) => {
  try {
    const products = await Product.find({
      _id: { $in: userCart.products.map((p) => p.product) },
    });

    userCart.total_price = products.reduce((total, product) => {
      const cartProduct = userCart.products.find(
        (p) => p.product.toString() === product._id.toString()
      );
      return total + parseFloat(product.price) * cartProduct.quantity;
    }, 0);

    await userCart.save();
  } catch (error) {
    console.error('Error updating cart total:', error);
  }
};

module.exports = {
  addCart,
  getCart,
  cartIncreament,
  cartDecreament,
  removeProduct,
};
