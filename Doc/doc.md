## Introduction

Gearsloth is a system that enables delayed tasks and persistent storage schemes
in Gearman queue server. It consists of a small javascript helper library and a
daemon that functions as both a gearman worker listening to delayed tasks and a
client submitting those tasks at a specified time. The gearslothd daemon
supports a database backend architecture which abstracts persisting delayed
tasks to a database.

## Gearslothd daemon modes

Gearslothd daemon running as *injector* receives delayed tasks sent by gearsloth
clients. These are saved to a persistent storage. Gearsloth *runners* then
receive pending tasks from the persistent storage and send these forward at a
specified time to *controllers* whose job is to submit the task to the final
destination, wait for the completion/failure of the task and rely this
information to *ejectors*, which in turn will remove the task from the
persistent store.

### Controllers

Controllers encapsulate a specific task retry strategy which governs when and
how a failing task is retried/failed. Controllers publish a gearman function
which is called by the runner on task expiry time. Gearslothd daemon
implements a default controller but users can implement custom controllers with
custom retry strategies and choose the controller they want to use on runtime
by specifying the controller gearman function name and a controller-specific
configuration object when submitting a delayed task.

Custom controllers must expose a gearman function that accepts a task object
that contains the name of the function that controller is expected to call
and a payload. The task object also contains an id that needs to be passed
on to the ejector component when the task has completed.

In a nutshell, a controller does the following:

1.  Publish a controller function that accepts a task object. This task object
    contains a `.func_name` and an optional `.payload`. The task object may
    also contain any custom fields set by the original client that the
    controller component may interpret freely.
2.  On receiving a task object from a runner component, call the gearman
    function `.func_name` with the payload `.payload`.
3.  When the task completes, pass the task object to the ejector component
    (gearman function `delayedJobDone`). The field `.id` that identifies a task
    must be passed to the ejector unchanged.

## Client interface (subject to change, controllers not implemented)

Gearsloth injector daemon adds the following functions to the gearman server:

### submitJobDelayed

Submits a task to be executed at a specified time. The task is given as a
UTF-8 encoded JSON object.

See the [task format specification](Task format specification.md)

## Client helper library (subject to change, strategies not implemented)

The file 'lib/gearsloth.js' includes some helper functions for Javascript
clients which aid in encoding, decoding and validating gearsloth tasks.

**`encodeTask(Object task)` -> `String`**

Encodes a task as a JSON string that can be passed to gearman.

**`decodeTask(String|Buffer task)` -> `Object`**

Decodes and validates a delayed task to a JSON task object.
