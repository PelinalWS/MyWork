const express = require("express");
const app = express();
const bodyParser = require("body-parser"); //body-parser is later used to format the information given in the post requests to signUp
const uRoute = require("./routes/users.js"); //used to reroute the urls that have /users
const tRoute = require("./routes/tasks.js"); //used to reroute the urls that have /tasks

app.use(bodyParser.urlencoded({extended: false})); //used to specify that the middleware does not get inputs encoded
app.use(bodyParser.json()); //specifies that the body-parser gets data in json format
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if(req.method === "OPTIONS"){
        res.header("Access-Control-Allow-Methods", "PUT", "POST", "PATCH", "DELETE", "GET");
        return res.status(200).json({});
    }
    next();
});
app.use("/users", uRoute); //reroutes the /users requests into the specified directory
app.use("/tasks", tRoute); //reroutes the /tasks requests into the specified directory
app.use((req, res, next) => { //if the code gets here, it will give a page not found error
    const error = new Error("Page not found");
    error.status = 404;
    next(error);
});
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: error.message
    });
});

module.exports = app; //used to call app from server.js