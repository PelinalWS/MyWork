const qt = require("../../db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const process = require("../../authKeys.json");


function listUsers(req, res) {
    const sqlc = `SELECT * FROM users ORDER BY uid ASC;`;
    qt.query(sqlc, (error, results) => {
        if (error) {
            error = new Error("Error occured while listing users.");
            console.log(error.message);
            res.status(500).json({
                error: error.message
            });
        };
        res.status(200).json({
            users: results.rows,
            token: req.userDec
        });
    });
}

function listUser(req, res) {
    const id = req.params.userId;
    const sqlc = `SELECT * FROM users WHERE uid = ${id};`;
    console.log(`Looking for user ${id}`);
    qt.query(sqlc, (error, results) => {
        if (error) {
            error = new Error("Error occured during query.");
            console.log(error.message);
            res.status(500).json({
                error: error.message
            });
        } else {
            if (results.rowCount === 0) {
                error = new Error(`User ${id} does not exist`);
                console.log(error.message);
                res.status(404).json({
                    error: error.message
                });
            } else {
                console.log(`User ${id} was found`);
                res.status(200).json({
                    user: results.rows[0],
                    token: req.userDec
                });
            }
        }
    });
}

function signup(req, res, next) {
    console.log("Got a request to sign up new user.");
    console.log("Checking if this account exists...");
    const email = req.body.email;
    const cid = req.body.cid;
    checkEmail(res, req.body.email, (error, det1, results) => {
        if(error) {
            res.status(500).json({
                error: error.message
            });
        } else {
            if(det1) {
                res.status(409).json({
                    message: `Account with email '${email}' already exists.`
                });
            } else {
                checkCID(res, req.body.cid, (error, det2) => {
                    if(error) {
                        res.status(500).json({
                            error: error.message
                        });
                    } else {
                        if(det2) {
                            res.status(409).json({
                                messasge: `Account with cid ${cid} already exists.`
                            });
                        } else {
                            console.log("Hashing..");
                            bcrypt.hash(req.body.pw, 10, (error, hash) => {
                                if(error) {
                                    error = new Error("Failed to hash the password.");
                                    res.status(500).json({
                                        error: error.message
                                    });
                                } else {
                                    console.log("Successfully hashed the password.");
                                    const user = setUser(req, hash);
                                    console.log("Starting query...");
                                    addUser(user, res);
                                }
                            });
                        }
                    }
                });
            }
        }
    });
}

function login(req, res, next) {
    console.log("Got a request to log in as an existing user.");
    console.log("Checking if this account exists...");
    const email = req.body.email;
    checkEmail(res, email, (error, det, results) => {
        if(error) {
            console.log(error.message);
            res.status(500).json({
                error: error.message
            });
        } else {
            if(!det) {
                console.log("Login failed.");
                res.status(401).json({
                    message: "Login failed."
                });
            } else {
                bcrypt.compare(req.body.pw, results.rows[0].pw, (error, res1) => {
                    if(error) {
                        console.log("Login failed.");
                        res.status(401).json({
                            message: "Login failed."
                        });
                    } if(res1) {
                        console.log("Login successful.");
                        const auth = results.rows[0].auth;
                        if(auth == "employed") {
                            const utok = jwt.sign({
                                email: results.rows[0].email,
                                userId: results.rows[0].uid,
                                authorization: auth
                            },
                            process.env.JWT_KEYR,
                            {
                                expiresIn: "10h"
                            }
                            );
                            res.status(200).json({
                                message: "Login successful.",
                                auth: auth,
                                uid: results.rows[0].uid,
                                token: utok
                            }); 
                        } else if(auth == "admin") {
                            const utok = jwt.sign({
                                email: results.rows[0].email,
                                userId: results.rows[0].uid,
                                authorization: auth
                            },
                            process.env.JWT_KEYA,
                            {
                                expiresIn: "10h"
                            });
                            res.status(200).json({
                                message: "Login successful.",
                                auth: auth,
                                token: utok,
                                uid: utok.userId
                            }); 
                        } else if(auth == "unemployed") {
                            console.log("You are not employed.");
                            res.status(401).json({
                                message: "Login failed"
                            });
                        } else {
                            console.log("Wait for admins to assign you a role.");
                            res.status(200).json({
                                message: "Authorization not assigned yet"
                            });
                        }
                    } else {
                        console.log("Login failed.");
                        res.status(401).json({
                            message: "Login failed."
                        });
                    }
                });
            }
        }
    });
}

//uses the posted body to insert a user into the users table
function addUser(user, res) {
    const sqlc = `INSERT INTO users (fname, lname, email, age, cid, dob, pw) VALUES (
        '${user.fname}', '${user.lname}', '${user.email}', ${user.age}, ${user.cid}, '${user.dob}', '${user.pw}'
    )`;
    console.log("Adding user...");
    qt.query(sqlc, (error, results) => {
        if (error) {
            error = new Error("User couldn't be created.");
            res.status(500).json({
                error: error.message
            });
        } else {
            console.log("Saved user records.");
            searchCreatedUser(user, res);
        }
    });
}

//used for viewing the uid of the user since the id is auto incremented, reverse searches the uid with other parameters
function searchCreatedUser(user, res){
    console.log("Looking up user records");
    const sqlc = `SELECT * FROM users WHERE fname = '${user.fname}' AND lname = '${user.lname}' AND email = '${user.email}'` +
        ` AND age = ${user.age} AND cid = ${user.cid} AND dob = '${user.dob}' AND pw = '${user.pw}'`;
    qt.query(sqlc, (error, results) => {
        if (error) {
            error = new Error("User couldn't be found.");
            res.status(500).json({
                error: error.message
            });
        } else {
            console.log("User successfully created.");
            res.status(201).json(results.rows);
        }
    });
}

function setUser(req, hash) {
    const user = {fname, lname, email, age, cid, dob} = req.body;
    user.pw = hash;
    return user;
}

function checkEmail(res, email, callback) {
    const sqlc = `SELECT * FROM users WHERE email = '${email}'`;
    qt.query(sqlc, (error, results) => {
        if(error) {
            error = new Error("Error occurred while searching for email.");
            callback(error, true, results);
        } else { 
            if(results.rowCount != 0) {
                callback(null, true, results);
            } else {
                console.log("Confirmed unique email");
                callback(null, false, results);
            }
        }
    });
}

function checkCID(res, cid, callback) {
    const sqlc = `SELECT * FROM users WHERE cid = ${cid}`;
    qt.query(sqlc, (error, results) => {
        if(error) {
            error = new Error("Error occured while searching for cid");
            callback(error, true);
        } else {
            if(results.rowCount != 0) {
                callback(null, true);
            } else {
                console.log("Confirmed unique cid");
                callback(null, false);
            }
        }
    });
}

function idChecker(uid, pw, req, res, callback){
    if(req.userDec.authorization == "admin") {
        console.log("Admin request approved.");
        callback(true);
    } else if(req.userDec.authorization == "employed") {
        console.log("Employee request recognized, pending for approval...");
        const sqlc = `SELECT * FROM users WHERE uid = ${uid};`;
        qt.query(sqlc, (error, results) => {
            if(error) {
                error = new Error("Error occured while searching user.");
                res.status(500).json( {
                    error: error.message
                });
            } else {
                if(results.rowCount != 1) {
                    error = new Error("Could not find the user with the given uid");
                    console .log(error.message);
                    res.status(404).json( {
                        error: error.message
                    });
                } else {
                    console.log("Found the user with the given uid.");
                    if(uid == req.userDec.userId){
                        console.log("Confirmed that the targeted user is you.");
                        bcrypt.compare(pw, results.rows[0].pw, (error) => {
                            if(error) {
                                error = new Error("Could not confirm password.");
                                res.status(401).json({
                                    error: error.message
                                });
                            } else {
                                console.log("Successfully confirmed password.");
                                console.log("Allowing the account update process.");
                                callback(true);
                            }
                        });
                    } else {
                        console.log("Could not confirm that the targeted user is you.");
                        callback(false);
                    }
                }
            }
        });
    }
}

function change(req,res){
    const uid = req.body.uid;
    const pw = req.body.pw;
    const op = req.body.op;
    quser.idChecker(uid, pw, req, res, (det1) => {
        if(det1){
            if(op == 1) {
                console.log("Got the request to change password.");
                const sqlc = `SELECT pw FROM users WHERE uid = ${uid};`;
                qt.query(sqlc, (error, results) => {
                    if(error) {
                        error = new Error("Could not confirm the existence of such an account");
                        console.log(error.message);
                        res.status(404).json({
                            error: error.message
                        });
                    } else {
                        bcrypt.compare(pw, results.rows[0].pw, (error, det2) => {
                            if(det2) {
                                console.log("Old password was matched. Continuing update..");
                                bcrypt.hash(req.body.newpw, 10, (error, hash) => {
                                    if(error) {
                                        error = new Error("Failed to hash the password.");
                                        res.status(500).json({
                                            error: error.message
                                        });
                                    } else {
                                        console.log("Successfully hashed the password.");
                                        const sqlc = `UPDATE users SET pw = '${hash}' WHERE uid = ${uid};`;
                                        console.log("Starting query...");
                                        qt.query(sqlc, (error, results) => {
                                            if(error) {
                                                error = new Error("Failed to update the password.");
                                                console.log(error.message);
                                                res.status(500).json({
                                                    error: error.message
                                                });
                                            } else {
                                                console.log("Successfully updated password.");
                                                res.status(200).json({
                                                    message: "Update successful."
                                                });
                                            }
                                        });                    
                                    }
                                });
                            } else {
                                console.log("Wrong password.");
                                res.status(401).json({
                                    message: "Wrong password."
                                });
                            }
                        });
                    }
                });
            } else if(op == 2) {
                console.log("Got the request to change email");
                quser.checkEmail(res, req.body.newemail, (error, det2, results) => {
                    if(error) {
                        error = new Error("Could not assign this email to you.");
                        console.log(error.message);
                        res.status(500).json({
                            error: error.message
                        });
                    } else {
                        if(det2) {
                            error = new Error("Could not assign this email to you.");
                            console.log(error.message);
                            res.status(500).json({
                                error: error.message
                            });
                        } else {
                            const sqlc = `UPDATE users SET email = '${req.body.newemail}' WHERE uid = ${uid};`;
                            console.log(sqlc);
                            qt.query(sqlc, (error, results) => {
                                if(error) {
                                    error = new Error("Error occured while updating email");
                                    res.status(500).json({
                                        error: error.message
                                    });
                                } else {
                                    console.log("Successfully updated email.");
                                    res.status(200).json({
                                        message: "Update successful.",
                                        token: req.userDec
                                    });
                                }
                            });
                        }
                    }
                });
            }
        } else {
            res.status(401).json({
                error: "Not authorized to make such changes."
            });
        }
    });
}

function authenticate(req, res) {
    console.log("Update user authorization");
    const uid = req.body.uid;
    const auth = req.body.auth;
    const sqlc = `UPDATE users SET auth = '${auth}' WHERE uid = ${id};`;
    qt.query(sqlc, (error, results) => {
        if(error) {
            error = new Error(`Error in authenticating user #${id}.`);
            res.status(500).json({
                error: error.message
            });
        } else {
            console.log(`Successfully updated user #${id}'s authentication.`);
            listUser(req, res);
        }
    });
}

function deleteUser(req, res) {
    const id = req.body.userId;
    const sqlc = `DELETE FROM users WHERE uid = ${id};`;
    qt.query(sqlc, (error, results) => {
        if(error) {
            error = new Error(`Error in deleting user ${id}`);
            res.status(500).json({
                error: error.message
            });
        }else{
            console.log(`Successfully deleted user ${id}`);
            res.status(200).json({
                message: `User ${id} deleted successfully`,
                token: req.userDec
             });
        }
    });
    console.log("Deletion complete");
}

module.exports = {listUsers, listUser, checkEmail, signup, login, idChecker, change, authenticate, deleteUser};