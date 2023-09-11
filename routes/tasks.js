const express = require("express"); //gets express
const router = express.Router(); //used to use express.Router's functions
const Authenticator = require("../auth.js"); //gets the functions from auth.js
const qtask = require("./qcommand/task.js") //gets the specific code that was refactored

router.get("/list", Authenticator.authorize, qtask.listTasks); //if the user is a user/admin, it will get all tasks

router.get("/:taskId", Authenticator.authorize, qtask.listTask); //if the user is a user/admin, it will get the specified task in the url

router.post("/", Authenticator.admin, qtask.createTask); //if the user is an admin, it will create a task with the information on the body

router.patch("/:taskId", Authenticator.authorize, qtask.taskManager); //if the user is a user, it will check if the task was assigned to you, then it will allowed you to either assign, unassign, complete or un-complete the task
                                                                      //if the user is an admin, you can do any of the patch operations even if the task was not assigned to you

router.patch("/:taskID/desc", Authenticator.authorize, qtask.descUpdate); //if the user is a user/admin, it will update the task description

router.delete("/:taskID", Authenticator.admin, qtask.deleteTask); //if the user is an admin, they can delete the task given in the url

module.exports = router;