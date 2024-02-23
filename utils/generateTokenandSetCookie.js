const jwt = require('jsonwebtoken');

const generateTokenAndSetCookie = (userId,userName,userRole,userLocation,res) => {
    const token = jwt.sign({userId,userName,userRole,userLocation},'MXIUuw6u5Ty0Ecih3XCjZ1+0575N2OTu0x9gsOl6pBc=',{
        expiresIn:'15d'
    });

    res.cookie("jwt",token,{
        maxAge:15*60*60*24*1000, //MS
        httpOnly:false, // prevent XSS attacks cross-site scripting attacks
        sameSite:"strict" // CSRF attacks cross-site request forgery attacks
    })
}

module.exports = {generateTokenAndSetCookie}