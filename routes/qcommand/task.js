const qt = require("../../db.js");


function listTasks(req, res) { //lists all tasks
    const sqlc = `SELECT * FROM tasks ORDER BY tid ASC;`;
    qt.query(sqlc, (error, results) => {
        if(error) throw error;
        res.status(200).json({
            tasks: results.rows, 
            token: req.userDec
        });
    });
}

function listTask(req, res) { //lists a specific task
    const id = req.params.taskId;
    const sqlc = `SELECT * FROM tasks WHERE tid = ${id};`;
    console.log(`Searching for task #${id}`);
    qt.query(sqlc, (error, results) => {
        if(error){ //error
            error = new Error(`Error while searching task #${id}`);
            res.status(500).json({
                error: error.message
            });
        } else { //no error
            if(results.rowCount == 0) { //no result
                res.status(404).json({
                    message: `Task#${id} does not exist`
                })
            } else { //there are results
                res.status(200).json({
                    task: results.rows[0],
                    token: req.userDec
                });
            }
        }
    });
}

function createTask(req, res) { //used by admins to create new taskss
    const task = {
        desc: req.body.desc
    };
    const sqlc = `INSERT INTO tasks (description) VALUES ('${task.desc}');`;
    qt.query(sqlc, (error, results) => { //queries to change the task's description
        if(error) { //error
            error = new Error("Could not create new task");
            res.status(500).json({
                error: error.message
            });
        } else { //no error
            console.log("Successfully created new task.");
            getTaskbyDesc(task, req, res); //gets the updated task
        }
    });
}

function getTaskbyDesc(task, req, res) { //finds the task by the given description
    const sqlc = `SELECT * FROM tasks WHERE description = '${task.desc}' ORDER BY tid;`;
    qt.query(sqlc, (error, results) => { //queries to find task by description
        if(error) { //error
            error = new Error("Could not find task with given description.");
            res.status(500).json({
                error: error.message
            });
        } else { //no error
            console.log("Found the submitted task.");
            res.status(201).json({
                tasks: results.rows,
                token: req.userDec
            });
        }
    });
}

function taskManager(req, res) { //gets other functions to manage the tasks
    const user = {op, uid, assigned, completion} = req.body;
    user.tid = req.params.taskId;
    idChecker(user.uid, user.tid, req, res, (result) => { //checks if the task is yours
        if(result) {
            if(user.op == 1) { //redirects to the task assignment function
                console.log("Assigning task request recognized..");
                taskAssigner(user.uid, user.tid, user.assigned, req, res);
            } else if(user.op == 2) { //redirects to the task completion function
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

function taskAssigner(uid, tid, assigned, req, res) { //sets completed to false regardless of what the assigned value is
    let sqlc = `UPDATE tasks SET assigned = '${assigned}', completed = 'false', 
                uid = CASE
                        WHEN '${assigned}' = 'false' THEN NULL
                        ELSE ${uid} 
                      END
                WHERE tid = ${tid};`;
    console.log("The task will be assigned to the user");
    qt.query(sqlc, (error, results) => { //queries to update the assign value where tid matches and uid is deleted if it is unassigned
        if(error) { //error
            if(assigned) { //assignment error
                error = new Error(`Error in assigning task ${tid} to user ${uid}`)
                res.status(500).json({
                    error: error.message
                });
            } else { //unassignment error
                error = new Error(`Error in unassigning task ${tid} from user ${uid}`);
                res.status(500).json({
                    error: error.message
                });
            }
        } else { //no error
            if(assigned){ //it is assigned, uid is added to the task
                console.log(`Successfully assigned task ${tid} to user ${uid}`);
            } else { //it is unassigned, uid is deleted from the task
                console.log(`Successfully unassigned task ${tid} from user ${uid}`);
            }
            req.params.taskId = tid;
            listTask(req, res); //finally shows the assigned task
        }
    });
}

function taskCompleter(uid, tid, completion, req, res) { //used to complete tasks
    const sqlc = `UPDATE tasks SET assigned = '${!completion}', completed = '${completion}' WHERE tid = ${tid};`;
    qt.query(sqlc, (error, results) => { //queries to change the complete column, will set assigned as the reverse, this way, even if completed tasks are unassigned from the user, the uid will remain to show who completed it
        if(error){ //error
            error = new Error(`Could not assign task #${tid}`);
            res.status(500).json({
                error: error.message
            });
        } else { //no error
            console.log(`User ${uid} successfully completed task ${tid}`);
            req.params.taskId = tid;
            listTask(req, res); //finally shows the completed task
        }
    });
}

function idChecker(uid, tid, req, res, callback){ //checks if the task is the user's or the user is an admin
    if(req.userDec.authorization == "admin") { //approves if the token is of an admin
        console.log("Admin request approved.");
        callback(true); //callback returns true
    } else if(req.userDec.authorization == "employed") { //will check to match user
        console.log("Employee request recognized, pending for approval...")
        const sqlc = `SELECT * FROM tasks WHERE uid = ${uid};`;
        qt.query(sqlc, (error, results) => {
            if(error) { //error
                error = new Error("Error occured while searching tasks.");
                res.status(500).json({
                    error: error.message
                });
            } else { //no error
                console.log("Searching for assigned tasks.");
                let found = false;
                for(const row of results.rows) { //will check the task ids assigned to you and find if the task in the input that you want to update is yours
                    if(tid == row.tid) { //will approve if there is a match
                        console.log("Found the targeted task.")
                        found = true; //will go as a callback
                        break; //breaks for loop for an early exit
                    }
                }
                callback(found); //callback
            }
        });
    }
}

function descUpdate(req, res) { //
    const task = {
        tid: req.params.taskID,
        desc: req.body.desc
    }
    idChecker(req.userDec.userId, task.tid, req, res,(result) => { //checks if the task was assigned to you or if you are an admin
        if (result === true) { //user is approved
            updateTaskDesc(task, req, res);
        } else { //user is not approved
            res.status(401).json({
                message: "Not authorized"
            });
        }
    });
}

function updateTaskDesc(task, req, res) { //updates given task's description
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
            listTask(req, res); //finally lists the task
        }
    });
}

function deleteTask(req, res) { //will delete task if the user is an admin
    const id = req.params.taskID;
    sqlc = `DELETE FROM tasks WHERE tid = ${id};`;
    qt.query(sqlc, (error, results) => { //queries to delete the task with the given tid
        if(error) { //error
            error = new Error(`Error occured while deleting task #${id}`);
            res.status(500).json({
                error: error.message
            });
        } else { //no error
            console.log(`Successfully deleted task #${id}`);
            res.status(200).json({
                message: `Successfully deleted task #${id}`
            });
        }
    });
}

module.exports = {listTasks, listTask, createTask, taskManager, descUpdate, deleteTask};