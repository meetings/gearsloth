## Gearsloth task format

Task is to be a JavaScript JSON object with the following format:

```
var task = {
   func_name: name of the function (Gearman task) to be executed,
          at: time of execution (optional),
       after: seconds after which this task is to be executed (optional),
  controller: name of the controller function that is to handle execution of the task (optional),
     payload: the payload that is to be passed to the function (task) (optional),
  runner_retry_timeout: the number of seconds after which one of the registered runners for this tasks func_name
                        (the database adapter picks one for each retry) will pick up the task again
                        in case the first runner was unable to pass the
                        task on for execution (to a worker). After a runner picks up the task this field
                        is updated instantly in the database. This field is optional,
  runner_retry_count:   the number of times a runner is to retry handling the task if
                        the previous runner was unable to pass the task on for execution (to a worker),
                        each time the database adapter passes this task to a runner, this field
                        is decreased by one (the database is then updated instantly). This field is optional.
}
```

### Description of fields

The only required field for task is `func_name`.

* `func_name`: is to be any string that corresponds to a Gearman function that is registered in the Gearman Job server. The function must be registered in the Gearman Job server at the moment of execution, it is not required earlier. Needless to say, if the function does not exist at execution time it will not be run and the task will likely fail to execute, depending on controllers and settings of the runner at the time of execution.
* `at`: if defined this is any string which is understood by the JavaScript `Date` API. `at` specifies the date and time at which the task is to be executed.
* `after`: if defined it supersedes the `at`. This is any string that is parseable into an integer as representative of *seconds* after which the task is to be executed.
* `controller`: if defined this is any string that corresponds to a Gearman function that has been written to handle the execution of tasks. If omitted a default behavior is adopted at the `runner` level.
* `runner_retry_timeout`: if defined this is any string that is parseable into an integer. See above for a more detailed description.
* `runner_retry_count`: if defined this is any string that is parseable into an integer. See above for a more detailed description.
* `payload`: if defined this can be anything that can be sanely converted into a string. It may also be a JSON object in itself. `payload` will be passed on to the `func_name` function as given or to the `controller` if defined for more processing.

#### Internal
* `id`: Set by the adapter. It should be an object with one mandatory property: `db_id`, which is mainly used by the composite adapter. `db_id` should be a (preferably human-readable) string based on the database configuration. The rest of the properties can be freely set by the adapter to identify the task.
* `first_run`: at the time of the first execution the current timestamp is stored into this field.

In addition the `task` JSON object may contain any number of fields (for example to be passed to the `controller`) These additional fields will not be taken into account in any way in the control flow other than in the custom `controller` if it is to do so.

### Marking jobs as done

After a job is done, a controller should send the task object to the ejector in order to remove it from the task database.
