const qt = require("../../db.js"); //gets the db.js to use the pg's Pool tool.
const bcrypt = require("bcrypt"); //used to hash password
const jwt = require("jsonwebtoken"); //used to encrypt info into token
const process = require("../../authKeys.json"); //gets the token keys


function listUsers(req, res) { //lists all users
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

function listUser(req, res) { //lists a specific user
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
            if (results.rowCount === 0) { //if the query worked without errors but returned no results
                error = new Error(`User ${id} does not exist`);
                console.log(error.message);
                res.status(404).json({
                    error: error.message
                });
            } else { //if the query was successful, returns the first result.
                console.log(`User ${id} was found`);
                res.status(200).json({
                    user: results.rows[0],
                    token: req.userDec
                });
            }
        }
    });
}

function signup(req, res, next) { //used to signup new user
    console.log("Got a request to sign up new user.");
    console.log("Checking if this account exists...");
    const email = req.body.email; //gets email and cid from inputs
    const cid = req.body.cid;
    checkEmail(res, req.body.email, (error, det1, results) => { //checks if the email exists within the database, returns an error, det1 is true if the email already has an account and det1 is false if there is not an account with the same email, results is used to access the query result
        if(error) { //error
            res.status(500).json({
                error: error.message
            });
        } else { //no error
            if(det1) { //email already exists
                res.status(409).json({
                    message: `Account with email '${email}' already exists.`
                });
            } else { //email does not exist
                checkCID(res, req.body.cid, (error, det2) => {
                    if(error) { //error
                        res.status(500).json({
                            error: error.message
                        });
                    } else { //no error
                        if(det2) { //an account with same cid exists
                            res.status(409).json({
                                messasge: `Account with cid ${cid} already exists.`
                            });
                        } else { //continues signing up
                            console.log("Hashing..");
                            bcrypt.hash(req.body.pw, 10, (error, hash) => { //hashes the password to save in the database with the "salt" 10
                                if(error) { //error
                                    error = new Error("Failed to hash the password.");
                                    res.status(500).json({
                                        error: error.message
                                    });
                                } else { //no error
                                    console.log("Successfully hashed the password.");
                                    const user = setUser(req, hash); //returns the data packed up to access from "user"
                                    console.log("Starting query...");
                                    addUser(user, res); //starts query to insert the new user into the database
                                }
                            });
                        }
                    }
                });
            }
        }
    });
}

function login(req, res, next) { //used to login and get a token
    console.log("Got a request to log in as an existing user.");
    console.log("Checking if this account exists...");
    const email = req.body.email; //gets the email from request body
    checkEmail(res, email, (error, det, results) => { //checks if a user with the same email exists within the database
        if(error) { //error
            console.log(error.message);
            res.status(500).json({
                error: error.message
            });
        } else { //no error
            if(!det) { //the email does not exist in the database
                console.log("Login failed.");
                res.status(401).json({
                    message: "Login failed."
                });
            } else { //the email exists in the database
                bcrypt.compare(req.body.pw, results.rows[0].pw, (error, res1) => { //compares the input password with the database one if it was hashed with this algorithm
                    if(error) { //error
                        console.log("Login failed.");
                        res.status(401).json({
                            message: "Login failed."
                        });
                    } if(res1) { // login successful
                        console.log("Login successful.");
                        const auth = results.rows[0].auth;
                        if(auth == "employed") { //checks for the auth on the database table
                            const utok = jwt.sign({ //the token gets "signed" with information about the user
                                email: results.rows[0].email,
                                userId: results.rows[0].uid,
                                authorization: auth
                            },
                            process.env.JWT_KEYR, //the user gets a random user key
                            {
                                expiresIn: "10h" //can set how long the token is meant to last before it needs to be recreated
                            }
                            );
                            res.status(200).json({ //returns the token in json
                                message: "Login successful.",
                                auth: auth,
                                uid: results.rows[0].uid,
                                token: utok
                            }); 
                        } else if(auth == "admin") { //checks for the auth on the database table
                            const utok = jwt.sign({ //signs the token with information about the user
                                email: results.rows[0].email,
                                userId: results.rows[0].uid,
                                authorization: auth
                            },
                            process.env.JWT_KEYA, //the user gets an admin key
                            {
                                expiresIn: "10h" //the token expires in 10 hours
                            });
                            res.status(200).json({ // returns info on the user and the token
                                message: "Login successful.",
                                auth: auth,
                                token: utok,
                                uid: utok.userId
                            }); 
                        } else if(auth == "unemployed") { //if the person is in the database and is not employed, they cannot login, this can be achieved by an admin setting that specific user as "unemployed"
                            console.log("You are not employed.");
                            res.status(401).json({
                                message: "Login failed"
                            });
                        } else { //means they don't have an auth
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

function addUser(user, res) { //uses the posted body to query and insert a user into the users table, calls searchCreatedUser at last to display the created user
    const sqlc = `INSERT INTO users (fname, lname, email, age, cid, dob, pw) VALUES (
        '${user.fname}', '${user.lname}', '${user.email}', ${user.age}, ${user.cid}, '${user.dob}', '${user.pw}'
    )`;
    console.log("Adding user...");
    qt.query(sqlc, (error, results) => {
        if (error) { //error
            error = new Error("User couldn't be created.");
            res.status(500).json({
                error: error.message
            });
        } else { //no error
            console.log("Saved user records.");
            searchCreatedUser(user, res); //queries to get the user and display it
        }
    });
}

function searchCreatedUser(user, res){ //used for viewing the uid of the user since the id is auto incremented, reverse searches the uid with other parameters
    console.log("Looking up user records");
    const sqlc = `SELECT * FROM users WHERE fname = '${user.fname}' AND lname = '${user.lname}' AND email = '${user.email}'` +
        ` AND age = ${user.age} AND cid = ${user.cid} AND dob = '${user.dob}' AND pw = '${user.pw}'`;
    qt.query(sqlc, (error, results) => {
        if (error) { //error
            error = new Error("User couldn't be found.");
            res.status(500).json({
                error: error.message
            });
        } else { //no error, prints the results.
            console.log("User successfully created.");
            res.status(201).json(results.rows[0]);
        }
    });
}

function setUser(req, hash) { //packs up all the required data for the user
    const user = {fname, lname, email, age, cid, dob} = req.body;
    user.pw = hash;
    return user;
}

function checkEmail(res, email, callback) { //checks if the email already exists within database
    const sqlc = `SELECT * FROM users WHERE email = '${email}'`;
    qt.query(sqlc, (error, results) => {
        if(error) { //error
            error = new Error("Error occurred while searching for email.");
            callback(error, true, results);
        } else { //no error
            if(results.rowCount != 0) { //if there is a result return true
                callback(null, true, results);
            } else { //if there is no result return false
                console.log("Confirmed unique email");
                callback(null, false, results);
            }
        }
    });
}

function checkCID(res, cid, callback) { //checks for citizenship id
    const sqlc = `SELECT * FROM users WHERE cid = ${cid}`;
    qt.query(sqlc, (error, results) => {
        if(error) { //error
            error = new Error("Error occured while searching for cid");
            callback(error, true);
        } else { //no error, the error is null
            if(results.rowCount != 0) { //if there is a result return true
                callback(null, true);
            } else { //if there is no result return false
                console.log("Confirmed unique cid");
                callback(null, false);
            }
        }
    });
}

function idChecker(uid, pw, req, res, callback) { //used to check if the user is you or an admin
    if(req.userDec.authorization == "admin") { //if the user is an admin they are given permission to change whatever they want
        console.log("Admin request approved.");
        callback(true);
    } else if(req.userDec.authorization == "employed") { //if the user is a random employee they will get checked for uid
        console.log("Employee request recognized, pending for approval...");
        const sqlc = `SELECT * FROM users WHERE uid = ${uid};`;
        qt.query(sqlc, (error, results) => {
            if(error) { //error
                error = new Error("Error occured while searching user.");
                res.status(500).json( {
                    error: error.message
                });
            } else { //no error
                if(results.rowCount != 1) { //There was no such user
                    error = new Error("Could not find the user with the given uid");
                    console .log(error.message);
                    res.status(404).json( {
                        error: error.message
                    });
                } else { //The user with the uid was found
                    console.log("Found the user with the given uid.");
                    if(uid == req.userDec.userId) { //Checks if the user that made the request and the result's uids match
                        console.log("Confirmed that the targeted user is you."); //they match
                        bcrypt.compare(pw, results.rows[0].pw, (error) => {
                            if(error) { //error
                                error = new Error("Could not confirm password.");
                                res.status(401).json({
                                    error: error.message
                                });
                            } else { //no error, returns true in the callback
                                console.log("Successfully confirmed password.");
                                console.log("Allowing the account update process.");
                                callback(true);
                            }
                        });
                    } else { //the uids did not match
                        console.log("Could not confirm that the targeted user is you.");
                        callback(false); //returns false in the callback
                    }
                }
            }
        });
    }
}

function change(req,res){ //used to change the user's password or email, gets uid, password and operation procedure as body input
    const uid = req.body.uid;
    const pw = req.body.pw;
    const op = req.body.op;
    quser.idChecker(uid, pw, req, res, (det1) => { //checks if the user is you or an admin
        if(det1){ //when given the ok
            if(op == 1) { //got the request to change password
                console.log("Got the request to change password.");
                const sqlc = `SELECT pw FROM users WHERE uid = ${uid};`;
                qt.query(sqlc, (error, results) => {
                    if(error) { //error
                        error = new Error("Could not confirm the existence of such an account");
                        console.log(error.message);
                        res.status(404).json({
                            error: error.message
                        });
                    } else { //no error
                        bcrypt.compare(pw, results.rows[0].pw, (error, det2) => { //compares the password with the hashed one
                            if(det2) { //matched password
                                console.log("Old password was matched. Continuing update..");
                                bcrypt.hash(req.body.newpw, 10, (error, hash) => { //tries to hash the new password
                                    if(error) { //error
                                        error = new Error("Failed to hash the password.");
                                        res.status(500).json({
                                            error: error.message
                                        });
                                    } else { //no error, new password is hashed
                                        console.log("Successfully hashed the password.");
                                        const sqlc = `UPDATE users SET pw = '${hash}' WHERE uid = ${uid};`;
                                        console.log("Starting query...");
                                        qt.query(sqlc, (error, results) => { //queries to change the password
                                            if(error) { //error
                                                error = new Error("Failed to update the password.");
                                                console.log(error.message);
                                                res.status(500).json({
                                                    error: error.message
                                                });
                                            } else { //no error, changed password
                                                console.log("Successfully updated password.");
                                                res.status(200).json({
                                                    message: "Update successful."
                                                });
                                            }
                                        });                    
                                    }
                                });
                            } else { //the passwords could not be matched.
                                console.log("Wrong password.");
                                res.status(401).json({
                                    message: "Wrong password."
                                });
                            }
                        });
                    }
                });
            } else if(op == 2) { //got the request to change email
                console.log("Got the request to change email");
                quser.checkEmail(res, req.body.newemail, (error, det2, results) => { //checks if the email exists within database
                    if(error) { //error
                        error = new Error("Could not assign this email to you.");
                        console.log(error.message);
                        res.status(500).json({
                            error: error.message
                        });
                    } else { //no error
                        if(det2) { //if the email already exists
                            error = new Error("Could not assign this email to you.");
                            console.log(error.message);
                            res.status(500).json({
                                error: error.message
                            });
                        } else { //if the email does not exist, continue
                            const sqlc = `UPDATE users SET email = '${req.body.newemail}' WHERE uid = ${uid};`;
                            console.log(sqlc);
                            qt.query(sqlc, (error, results) => {
                                if(error) { //error
                                    error = new Error("Error occured while updating email");
                                    res.status(500).json({
                                        error: error.message
                                    });
                                } else { //no error, changes email
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
        } else { //not authorized
            res.status(401).json({
                error: "Not authorized to make such changes."
            });
        }
    });
}

function authenticate(req, res) { //used by an admin to change an user's authentication
    console.log("Update user authorization");
    const uid = req.body.uid;
    const auth = req.body.auth;
    const sqlc = `UPDATE users SET auth = '${auth}' WHERE uid = ${id};`;
    qt.query(sqlc, (error, results) => { //queries to change auth
        if(error) { //error
            error = new Error(`Error in authenticating user #${id}.`);
            res.status(500).json({
                error: error.message
            });
        } else { //no error
            console.log(`Successfully updated user #${id}'s authentication.`);
            listUser(req, res); //lists the updated user's fields
        }
    });
}

function deleteUser(req, res) { //used by an admin to delete an user
    const id = req.body.userId;
    const sqlc = `DELETE FROM users WHERE uid = ${id};`;
    qt.query(sqlc, (error, results) => {
        if(error) { //error
            error = new Error(`Error in deleting user ${id}`);
            res.status(500).json({
                error: error.message
            });
        }else{ //no error
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