const qt = require("../../db.js");


function listTasks(req, res) {
    const sqlc = `SELECT * FROM tasks ORDER BY tid ASC;`;
    qt.query(sqlc, (error, results) => {
        if(error) throw error;
        res.status(200).json({
            tasks: results.rows, 
            token: req.userDec
        });
    });
}

function listTask(req, res) {
    const id = req.params.taskId;
    const sqlc = `SELECT * FROM tasks WHERE tid = ${id};`;
    console.log(`Searching for task #${id}`);
    qt.query(sqlc, (error, results) => {
        if(error){
            error = new Error(`Error while searching task #${id}`);
            res.status(500).json({
                error: error.message
            });
        } else {
            if(results.rowCount == 0) {
                res.status(404).json({
                    message: `Task#${id} does not exist`
                })
            } else {
                res.status(200).json({
                    task: results.rows[0],
                    token: req.userDec
                });
            }
        }
    });
}

function createTask(req, res) {
    const task = {
        desc: req.body.desc
    };
    const sqlc = `INSERT INTO tasks (description) VALUES ('${task.desc}');`;
    qt.query(sqlc, (error, results) => {
        if(error) {
            error = new Error("Could not create new task");
            res.status(500).json({
                error: error.message
            });
        } else {
            console.log("Successfully created new task.");
            getTaskbyDesc(task, req, res);
        }
    });
}

function getTaskbyDesc(task, req, res) {
    const sqlc = `SELECT * FROM tasks WHERE description = '${task.desc}' ORDER BY tid;`;
    qt.query(sqlc, (error, results) => {
        if(error) {
            error = new Error("Could not find task with given description.");
            res.status(500).json({
                error: error.message
            });
        } else {
            console.log("Found the submitted task.");
            res.status(201).json({
                tasks: results.rows,
                token: req.userDec
            });
        }
    });
}

function updateTaskDesc(task, req, res) {
    const sqlc = `UPDATE tasks SET description = '${task.desc}' WHERE tid = ${task.tid};`;
    console.log(sqlc);
    qt.query(sqlc, (error, results) => {
        if(error) {
            error = new Error(`Error occured while updating task #${task.tid}'s description.`)
            res.status(500).json({
                error: error.message
            });
        } else {
            console.log(`Task #${task.tid}'s description has successfully been updated.`);
            getTask(task.tid, req, res);
        }
    });
}

function taskManager(req, res) {
    const user = {op, uid, assigned, completion} = req.body;
    user.tid = req.params.taskId;
    idChecker(user.uid, user.tid, req, res, (result) => {
        if(result) {
            if(user.op == 1) {
                console.log("Assigning task request recognized..");
                taskAssigner(user.uid, user.tid, user.assigned, req, res);
            } else if(user.op == 2) {
                console.log("Completing task request recognized..");
                taskCompleter(user.uid, user.tid, user.completion, req, res);
            }
        } else {
            res.status(401).json({
                message: "Not authorized"
            });
        }
    });
}

function taskAssigner(uid, tid, assigned, req, res) {
    let sqlc = `UPDATE tasks SET assigned = '${assigned}', completed = 'false', 
                uid = CASE
                        WHEN '${assigned}' = 'false' THEN NULL
                        ELSE ${uid} 
                      END
                WHERE tid = ${tid};`;
    console.log("The task will be assigned to the user");
    qt.query(sqlc, (error, results) => {
        if(error) {
            if(assigned) {
                error = new Error(`Error in assigning task ${tid} to user ${uid}`)
                res.status(500).json({
                    error: error.message
                });
            } else {
                error = new Error(`Error in unassigning task ${tid} from user ${uid}`);
                res.status(500).json({
                    error: error.message
                });
            }
        } else {
            if(assigned){
                console.log(`Successfully assigned task ${tid} to user ${uid}`);
            } else {
                console.log(`Successfully unassigned task ${tid} from user ${uid}`);
            }
            req.params.taskId = tid;
            listTask(req, res);
        }
    });
}

function taskCompleter(uid, tid, completion, req, res) {
    const sqlc = `UPDATE tasks SET assigned = '${!completion}', completed = '${completion}' WHERE tid = ${tid};`;
    qt.query(sqlc, (error, results) => {
        if(error){
            error = new Error(`Could not assign task #${tid}`);
            res.status(500).json({
                error: error.message
            });
        } else {
            console.log(`User ${uid} successfully completed task ${tid}`);
            req.params.taskId = tid;
            listTask(req, res);
        }
    });
}

function idChecker(uid, tid, req, res, callback){
    if(req.userDec.authorization == "admin") {
        console.log("Admin request approved.");
        callback(true);
    } else if(req.userDec.authorization == "employed") {
        console.log("Employee request recognized, pending for approval...")
        const sqlc = `SELECT * FROM tasks WHERE uid = ${uid};`;
        qt.query(sqlc, (error, results) => {
            if(error) {
                error = new Error("Error occured while searching tasks.");
                res.status(500).json({
                    error: error.message
                });
            } else {
                console.log("Searching for assigned tasks.");
                let found = false;
                for(const row of results.rows) {
                    if(tid == row.tid) {
                        console.log("Found the targeted task.")
                        found = true;
                        break;
                    }
                }
                callback(found);
            }
        });
    }
}

function descUpdate(req, res) {
    const task = {
        tid: req.params.taskID,
        desc: req.body.desc
    }
    idChecker(req.userDec.userId, task.tid, req, res,(result) => {
        if (result === true) {
            updateTaskDesc(task, req, res);
        } else {
            res.status(401).json({
                message: "Not authorized"
            });
        }
    });
}

function updateTaskDesc(task, req, res) {
    const sqlc = `UPDATE tasks SET description = '${task.desc}' WHERE tid = ${task.tid};`;
    qt.query(sqlc, (error, results) => {
        if(error) {
            error = new Error(`Error occured while updating task #${task.tid}'s description.`)
            res.status(500).json({
                error: error.message
            });
        } else {
            console.log(`Task #${task.tid}'s description has successfully been updated.`);
            req.params.taskId = task.tid;
            listTask(req, res);
        }
    });
}

function deleteTask(req, res) {
    const id = req.params.taskID;
    sqlc = `DELETE FROM tasks WHERE tid = ${id};`;
    qt.query(sqlc, (error, results) => {
        if(error) {
            error = new Error(`Error occured while deleting task #${id}`);
            res.status(500).json({
                error: error.message
            });
        } else {
            console.log(`Successfully deleted task #${id}`);
            res.status(200).json({
                message: `Successfully deleted task #${id}`
            });
        }
    });
}

module.exports = {listTasks, listTask, createTask, taskManager, descUpdate, deleteTask};