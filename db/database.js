const mongoose = require('mongoose');
const CONNECTION = 'mongodb+srv://sajan2121089:sajank1818@cluster0.mg5p7to.mongodb.net/?retryWrites=true&w=majority';

const connectDb = async () => {
    try {
        const connect = await mongoose.connect(CONNECTION);
        console.log("Database connected Successfully");
    } catch (error) {
        console.log("Error", error);
    }
};

module.exports = connectDb;
