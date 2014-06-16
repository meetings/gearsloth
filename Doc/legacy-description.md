
gearman-delayed-task
====================

Delayed task workers and persistent storage schemes for Gearman

Here is the project description that can be submitted. It is very factual and it might be better to strip it down to something which is more appealing (for example open up what can be done with it).

# Introduction

We at Meetin.gs Oy have been using the open source distributed work server [Gearman](http://gearman.org) to successfully provide redundancy and scalability for our operations. While Gearman is good at executing tasks instantly, we have found ourselves lacking a reliable way to requests some tasks like cache priming and email dispatching later after other processes have already completed.

# Project goal

Build a redundant and scalable system for storing Gearman tasks in a persistent storage and have them executed at a given time.

We would like to implement the system as a public, MIT licensed open source project hosted under Meetin.gs Oy Github account.

The interface for storing a task in this system shuold itself be a Gearman task. Our hope is that this project would grow to be the standard way to add the delayed task capability to a Gearman infrastructure.

To this end we would love to have team members who are interested in open source development and also in building resilient and well tested infrastructure components.

# Old Introduction
[Gearman](http://gearman.org) provides an open source distributed work server infrastructure with no single point of failure. Currently Gearman does not support running delayed jobs and due to it's design it is very unlikely that it will ever do so reliably(*). The aim of this software engineering project is to implement a set of redundant services and workers which allow storing delayed jobs reliably to a set of databases and executing them afterwards.

# Old History and references
The task has already been attempted once as a project named [Garivini](https://github.com/dormando/Garivini) but it was never finished due to business reasons. The Garivini project took a lot of ideas from a previous project called [TheSchwartz](http://search.cpan.org/~bradfitz/TheSchwartz-1.07/) and tried to bypass some of it's problems by implementing the ideas as a set of Gearman workers.

# Old Project output
The currently expected output of the project is 2 different working Gearman worker process daemons, a working control process daemon and instructions on setting up a database cluster for the back-end. Together these implement a slightly augmented subset of the ideas contained in the previously mentioned software projects. The results are expected to be published as open source and maintained by Meetin.gs Oy in Github.

# Old Detailed goals
The system functionality is stripped to submitting only one job at a time, without coalescing, without uniqueness constrants and without control flags. JSON will be used as the data encoding language for the tasks as with Garivini. No transparency to the job execution status will be provided through the workers but some additional failure handling parameters will be added.

All 3 daemons will be designed to be run at multiple locations simultaneously as with Garivini. A Node.js implementation would be preferable due to popularity, inherently event driven runtime and existing skillsets within Meetin.gs.

The expected back-end database setup and the database expectations are defined more clearly to allow reliability and scalability. A back-end consisting of multiple multi-master MySQL clusters will be the primary target.

A comprehensive step by step install guide for the daemons and the mysql instances is expected. A comprehensive test suite that is dependent on an existing Gearman cluster and an existing MySQL environment is expected.

# Old Notes

(*) In the current design the servers do not share any state and there is no critical state associated with any of them. This means that even properly received background jobs are in no way guaranteed to be executed in case of some failures. There have been some work to enable "persistent delayed jobs" in the gearman through modules but adding even a small critical state component would complicate the server maintenance requirements substantially and would have a severe impact on the performance of the daemon. Here are some problems of the persistent delayed jobs architecture:

* The persistence logic is embedded in the gearman server and must be compiled in as modules. This makes deployment, tuning and development of the persistence logic more complicated and more prone to cause issues that affect normal operation of the gearman server.
* Possibly tue do the difficulty and high stability requirements for developing them, the modules and especially their maintenance documentation seems to be poorly documented and hard to understand. For example the following questions are unsanswered in most persistence modules: What happens to your tasks and what are you supposed to do if your module backend database goes offline for a while during normal operation? How do you recover if this outage is a long one or a short one? Can several servers use the same external backend and carry the tasks of a missing server? How can you make sure the data is stored on two separate locations before client is informed that the task is properly recorded? How does the client receive information of problems in the persistence layer and how is the logging of these problems handled?
* The functionality of the modules is limited to the hooks provided by the Gearman server. For example you can not alter the state of a delayed job retry logic using the modules. Providing additional hooks would furter complicate writing the modules and expose the server to more potential instability due to code in modules.
