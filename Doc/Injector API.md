## Injector API

The injector is a component that inserts a delayed task to the persistent storage. It registers the function `submitJobDelayed` to gearman job server(s). The task to be delayed should be sent to the injector in the format specified in [task format specification](Task format specification.md)

If the task is succesfully inserted in to the persistent storage, injector will send gearman `WORK_COMPLETE` to the caller. This means that the task *will* be executed.

### Error handling

If there is an error parsing the task, or if the injector fails to insert the task to the persistent storage, it will send `WORK_WARNING` with the appropriate error message followed by `WORK_FAIL` to the caller. This always means that the job *will not* be executed.

### Events

* `connect`: will be emitted when the injector is connected to at least one Gearman job server.
* `disconnect`: will be emitted when the injector has lost connection to all Gearman job servers.
