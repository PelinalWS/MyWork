const process = require("./authKeys.json"); //gets a reference for the keys required to decipher the tokens
const webtok = require("jsonwebtoken"); //states the requirement for the module

//both admin and authorize will be used in function called without parameters so express fills them in
const admin = (req, res, next) => { //used to verify the authorization of "admin"
    try{
        console.log("Checking admin authorization..");
        const atok = req.headers.authorization; //gets the token from the request header, atok stands for admin token
        const decodedtk = webtok.verify(atok, process.env.JWT_KEYA); //checks whether the token was made using the "admin key"
        req.userDec = decodedtk; //passes the token verification as an attribute in the request
        next(); //enters the next function as per callback functions do
    } catch(error) {
        res.status(401).json({
            message: "Failed to authorize."
        });
    }
}

const authorize = (req, res, next) => { //used to verify the authorization of "admin" or "random"
    try {
        console.log("Checking token..");
        const utok = req.headers.authorization; //gets the token from the request header, utok stands for user token
        const validKeys = [process.env.JWT_KEYA, process.env.JWT_KEYR]; //has both keys to compare
        for(const key of validKeys){ //does it for both types of keys, does the admin one first
            try {
                const decodedtk = webtok.verify(utok, key); //checks whether the token was made using either "admin" or "user" key
                req.userDec = decodedtk; //passes the token verification as an attribute in the request
                next();
                return;
            } catch(error) {
            }
        }
        throw new Error("Invalid token")
    } catch(error) {
        res.status(401).json({
            message: "Failed to authorize."
        });
    }   
};

module.exports = {admin, authorize};