const express = require("express");
const router = express.Router();
const Authenticator = require("../auth.js");
const qtask = require("./qcommand/task.js")

router.get("/list", Authenticator.authorize, qtask.listTasks);

router.get("/:taskId", Authenticator.authorize, qtask.listTask);

router.post("/", Authenticator.admin, qtask.createTask);

router.patch("/:taskId", Authenticator.authorize, qtask.taskManager);

router.patch("/:taskID/desc", Authenticator.authorize, qtask.descUpdate);

router.delete("/:taskID", Authenticator.authorize, qtask.deleteTask);

module.exports = router;