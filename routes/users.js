const express = require("express");
const router = express.Router();
const Authenticator = require("../auth.js");
const quser = require("./qcommand/user.js");

router.get("/list", Authenticator.admin, quser.listUsers);

router.get("/:userId", Authenticator.admin, quser.listUser);

//gets all the data for the user except for the uid and calls the addUser function to add the user.
router.post("/signUp", quser.signup);

router.post("/logIn", quser.login);

router.patch("/changeInfo/", Authenticator.authorize, quser.change);

router.patch("/update", Authenticator.admin, quser.authenticate);

//deletes an user by calling deleteUser function
router.delete("/removeUser", Authenticator.admin, quser.deleteUser);

module.exports = router;