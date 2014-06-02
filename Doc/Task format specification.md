## Gearsloth task format

Task is to be a JavaScript JSON object with the following format:

```
var task = {
   func_name: name of the function (Gearman task) to be executed,
          at: time of execution (optional),
       after: seconds after which this task is to be executed (optional),
  controller: name of the controller function that is to handle execution of the task (optional),
     payload: the payload that is to be passed to the function (task) (optional),
  runner_retry_timeout: seconds after which the runner will retry executing the task in case 
                        the runner was unable to pass the task on for execution (optional),
    runner_retry_count: number of times the runner is to retry executing the task if 
                        it fails to pass the task on for execution (optional)
}
```

### Description of fields

The only required field for task is `func_name`.

* `func_name`: is to be any string that corresponds to a Gearman function that is registered in the Gearman Job server. The function must be registered in the Gearman Job server at the moment of execution, it is not required earlier. Needless to say, if the function does not exist at execution time it will not be run and the task will likely fail to execute, depending on controllers and settings of the runner at the time of execution.
* `at`: if defined this is any string which is understood by the JavaScript `Date` API. `at` specifies the date and time at which the task is to be executed.
* `after`: if defined it supersedes the `at`. This is any string that is parseable into an integer as representative of *seconds* after which the task is to be executed.
* `controller`: if defined this is any string that corresponds to a Gearman function that has been written to handle the execution of tasks. If omitted a default behavior is adopted at the `runner` level.
* `runner_retry_timeout`: if defined this is any string that is parseable into an integer. Represents the time in seconds after which a runner is to retry submitting the task for execution if it failed to do so previously.
* `runner_retry_count`: if defined this is any string that is parseable into an integer. Represents the number of times a runner is to try to submit the task for execution if it failed to do so previously.
* `payload`: if defined this can be anything that can be sanely converted into a string. It may also be a JSON object in itself. `payload` will be passed on to the `func_name` function as given or to the `controller` if defined for more processing.
* `first_run`: at the time of the first execution the current timestamp is stored into this field. *Don't use this field.*


In addition the `task` JSON object may contain any number of fields (for example to be passed to the `controller`) These additional fields will not be taken into account in any way in the control flow other than in the custom `controller` if it is to do so.

### Marking jobs as done

After a job is done, a controller should send a JSON object with the following fields to the ejector in order to remove it from the task database:
* `id`: a string that identifies the task in the database

In addition the `task` JSON object may contain any number of other fields. Any other fields that are not defined here will not not be taken into account in any way in the control flow other than in the custom `controller` if it has been written to do so. The only limitation of these fields is that they must not break the stringifying or parseing operations done the the `task` JSON object.

