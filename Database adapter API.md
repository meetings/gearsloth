## Database adapter API

The database adapters implement the interface that should be used from within *injectors*, *runners* and *controllers*. Each adapter implements the following functions in accordance with their specified database type:

* `initialize(configuration, callback)`: Initializes the database connection(s) with given configuration, then calls the callback whilst exporting the actual API into the database.
* `saveTask(task, callback)`: Saves the given JavaScript object into the database, then calls the callback.
* `listenTask(callback)`: Listens to (or polls, depending on database type) expiring tasks and calls the callback function with each *task id* returned by the database query.
* `updateTask(task_id, status, callback)`: Updates the task with the given *id* to have the provided *status*, then calls the callback.
* `grabTask(task_id, callback)`: Queries the database for the task with the given *id* and if the task was available with the *NEW* status, updates it's status to *PENDING* and calls the callback with the task as JavaScrtipt object.
* `deleteTask(task_id, callback)`: Deletes the task with the given id from the database.

In addition each adapter implements a set of enumerable *status* types, which are also exported, and should be used in conjunction with the `updateTask` function:
* `status.NEW`: When a task is first saved to the database, it is given this status.
* `status.PENDING`: When a task is grabbed succesfully from the database to be dispatched for execution this is it's updated status.
* `status.FAIL`: The *controller* responsible for dispatching and listening to the tasks execution state may set the status of a failed task to this.
* `status.DONE`: The *controller* may also set the status of the task to this status.
The *controller* may use any other string as status, however the default functions of the adapter implementations do not cover handling of custom status types.


## SQLITE adapter behavior


