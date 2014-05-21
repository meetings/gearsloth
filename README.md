
## gearsloth

Delayed task workers and persistent storage schemes for Gearman.

### Documentation

* [Documentation](doc.md)

### Running tests

    $ npm test

### Running example worker/client

    $ make log-delayed-test

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
