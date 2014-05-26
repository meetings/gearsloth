## Gearsloth task format

Task is to be a JavaScript JSON object with the following format:

```JSON
var task = {
   func_name: name of the function (task) to be executed,
          at: Datetime as JavaScript object (optional),
       after: seconds after which this task is to be executed (optional),
  controller: name of the controller function that is to handle execution of the task (optional),
     payload: the payload that is to be passed to the function (task) (optional),
  runner_retry_timeout: seconds after which the runner will retry executing the task in case the runner was unable to pass the task on for
  execution (optional),
    runner_retry_count: number of times the runner is to retry executing the task if it fails to pass the task on for execution (optional)
}
```

### Desctription of fields

The only required field for task is `func_name`.

* `func_name`: is to be any string that is correspondant of a Gearman function that is registered in the Gearman Job server. The function must be registered in the Gearman Job server at the moment of execution, it is not required earlier. Needless to say, if the function does not exist at execution time it will not be run and the task will likely fail to execute, depending on controllers and other settings of the runners at the time of execution.
* `at`: if defined it is to be any string which is understood by the JavaScript `Date` API. `at` specifies the datetime at which the task is to be executed.
* `after`: if defined it supersedes the `at` and is to be any string that is parseable into an integer representation of *seconds* after which the task is to be executed.
* `controller`: if defined it is to be any string that is correspondant of a Gearman function that has been written to handle the execution of tasks. Can be omitted, in which case a default behavior is adopted at the `runner`-level.
* `runner_retry_timeout`: if defined it should be any string that is parseable into an integer. Represents the seconds after which the runner is to retry submitting the task for execution if it failed to do so previously.
* `runner_retry_count`: if defined it is to be any string that is parseable into an integer. Represents the number of times the runner is to try to submit the task for execution if it failed to do so previously.
* `payload`: if defined it is to be any string that is parseable into a JavaScript JSON object. Will be passed on to the `func_name` function that is submitted as a delayed task.

In addition the `task` JSON object may contain any number of fields (for example to be passed to the `controller`) These additional fields will not be taken into account in any way in the control flow other than in the custom `controller` if it is to do so.
