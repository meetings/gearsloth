
## Introduction

Gearsloth is a system that enables delayed tasks and persistent storage schemes
in Gearman queue server. It consists of a small javascript helper library and a
daemon that functions as both a gearman worker listening to delayed tasks and a
client submitting those tasks at a specified time. The gearslothd daemon
supports a database backend architecture which abstracts persisting delayed
tasks to a database.

## Quick start

1. Read about the basic structure of gearsloth [Structure](Doc/Structure.md)
2. Start gearmand on localhost to default port
3. Start Gearsloth in all modes with `./bin/gearslothd`
4. [Configure](Doc/Configuration.md) your gearsloth

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

    sloth:~$ cd /vagrant
    sloth:~$ make test

### Links

 * [Gearman project](http://gearman.org)
 * [Original project description](description.md)
