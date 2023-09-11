const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const uRoute = require("./routes/users.js");
const tRoute = require("./routes/tasks.js");

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if(req.method === "OPTIONS"){
        res.header("Access-Control-Allow-Methods", "PUT", "POST", "PATCH", "DELETE", "GET");
        return res.status(200).json({});
    }
    next();
});
app.use(express.static('public'));
app.use("/users", uRoute);
app.use("/tasks", tRoute);
app.use((req, res, next) => {
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

module.exports = app;