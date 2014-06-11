
## Introduction

Gearsloth is a system that enables delayed tasks and persistent storage schemes
in Gearman queue server. It consists of a small javascript helper library and a
daemon that functions as both a gearman worker listening to delayed tasks and a
client submitting those tasks at a specified time. The gearslothd daemon
supports a database backend architecture which abstracts persisting delayed
tasks to a database.

### Quick start

1. Read about the basic [structure](Doc/Structure.md) of gearsloth
2. [Configure](Doc/Configuration.md) your gearsloth or just start it in all modes with `./bin/gearslothd`
3. Learn how to [submit delayed tasks](Doc/Injector API.md) to gearsloth


### Running tests

    $ npm test

### Running example worker/client

    $ make log-delayed

### Running sqlite adapter example

    $ node ./examples/sqlite-adapter-example.js

or use make targets `test` or `unit-test`.

### Running tests in virtualized environment

    $ vagrant up
    $ vagrant ssh

    sloth:~$ cd gearsloth
    sloth:~/gearsloth$ make test

### Links
 
 * [Documentation](Doc)
 * [Gearman project](http://gearman.org)
 * [Original project description](Doc/legacy-description.md)
