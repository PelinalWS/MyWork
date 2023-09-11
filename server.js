const http = require("http"); //specifies the request type
const app = require("./app") //used to use the functions in app.js
const port = 3000; //the port in localhost
const server = http.createServer(app); 
server.listen(port, () => console.log("server listening on port "+port)); //server startup message
