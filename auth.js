const process = require("./authKeys.json");
const webtok = require("jsonwebtoken");

const admin = (req, res, next) => {
    try{
        console.log("Checking admin authorization..");
        const atok = req.headers.authorization;
        const decodedtk = webtok.verify(atok, process.env.JWT_KEYA);
        req.userDec = decodedtk;
        next();
    } catch(error) {
        res.status(401).json({
            message: "Failed to authorize."
        });
    }
}

const authorize = (req, res, next) => {
    try {
        console.log("Checking token..");
        const utok = req.headers.authorization;
        const validKeys = [process.env.JWT_KEYA, process.env.JWT_KEYR];
        for(const key of validKeys){
            try {
                const decodedtk = webtok.verify(utok, key);
                req.userDec = decodedtk;
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