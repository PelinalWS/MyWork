const express = require("express"); //gets express
const router = express.Router(); //used to use express.Router's functions
const Authenticator = require("../auth.js"); //gets the functions from auth.js
const quser = require("./qcommand/user.js"); //gets the specific code that was refactored

router.get("/list", Authenticator.admin, quser.listUsers); //lists all users if the user's authorization is of an admin

router.get("/:userId", Authenticator.admin, quser.listUser); //lists a specific user given in the url if the user is an admin

router.post("/signUp", quser.signup); //signup does not require authorization because the user does not even exist yet.

router.post("/logIn", quser.login); //log in to get/create the authorization token in the response

router.patch("/changeInfo/", Authenticator.authorize, quser.change); //used to change specific information about the user

router.patch("/update", Authenticator.admin, quser.authenticate); //used to change a user's authorization to the level in the body if the authorization token in the header is of an admin

router.delete("/removeUser", Authenticator.admin, quser.deleteUser); //deletes an user by calling deleteUser function if the authorization is of an admin

module.exports = router;