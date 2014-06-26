
## Introduction

Gearsloth is a system that enables delayed tasks and persistent storage schemes
in Gearman job server. The gearsloth stack consists of four components: injector,
runner, controller and ejector. Gearsloth
supports a database backend architecture which abstracts persisting delayed
tasks to a database.

![Simple gearsloth configuration](Doc/gearsloth-simple.png "Simple gearsloth configuration")

This is the simplest gearsloth configuration. Gearsloth's components are marked with green.

![Advanced gearsloth configuration](Doc/gearsloth-advanced.png "Advanced gearsloth configuration")

As seen above, one may add more Gearman job servers and databases to the configuration in order to make
the system more *robust*. Multiple instances of injector/runner/controller/ejector may also be run.

### Components briefly

* **injector**: Receives a task and inserts it to a database.
* **runner**: Fetches a scheduled task from a database and passes it to controller.
* **controller**: Passes the task to a worker and monitors the state of the task.
It may for example retry the task if it fails.
* **ejector**: After being called by a controller, removes the task from the database.

### Running tests

    $ npm test

### Running tests in virtualized environment

    $ vagrant up
    $ vagrant ssh

    sloth:~$ cd gearsloth
    sloth:~/gearsloth$ make test

### Links
 
 * [Documentation](Doc)
 * [Gearman project](http://gearman.org)
 * [Original project description](Doc/legacy-description.md)
