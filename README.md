gearman-delayed-task
====================

Delayed task workers and persistent storage schemes for Gearman

Here is the project description that can be submitted. It is very factual and it might be better to strip it down to something which is more appealing (for example open up what can be done with it).

# Introduction
[Gearman](http://gearman.org/) provides an open source distributed work server infrastructure with no single point of failure. Currently Gearman does not support running delayed jobs and due to it's design it is very unlikely that it will ever do so reliably(*). The aim of this software engineering project is to implement a set of redundant services and workers which allow storing delayed jobs reliably to a set of databases and executing them afterwards.

# History and references
The task has already been attempted once as a project named [Garivini](https://github.com/dormando/Garivini) but it was never finished due to business reasons. The Garivini project took a lot of ideas from a previous project called [TheSchwartz](http://search.cpan.org/~bradfitz/TheSchwartz-1.07/) and tried to bypass some of it's problems by implementing the ideas as a set of Gearman workers.

# Project output
The currently expected output of the project is 2 different working Gearman worker process daemons, a working control process daemon and instructions on setting up a database cluster for the back-end. Together these implement a slightly augmented subset of the ideas contained in the previously mentioned software projects. The results are expected to be published as open source and maintained by Meetin.gs Oy in Github.

# Detailed goals
The system functionality is stripped to submitting only one job at a time, without coalescing, without uniqueness constrants and without control flags. JSON will be used as the data encoding language for the tasks as with Garivini. No transparency to the job execution status will be provided through the workers but some additional failure handling parameters will be added.

All 3 daemons will be designed to be run at multiple locations simultaneously as with Garivini. A NodeJS implementation would be preferable due to popularity, inherently event driven runtime and existing skillsets within Meetin.gs.

The expected back-end database setup and the database expectations are defined more clearly to allow reliability and scalability. A back-end consisting of multiple multi-master MySQL clusters will be the primary target.

A comprehensive step by step install guide for the daemons and the mysql instances is expected. A comprehensive test suite that is dependent on an existing Gearman cluster and an existing MySQL environment is expected.

# Notes

(*) In the current design the servers do not share any state and there is no critical state associated with any of them. This means that even properly received background jobs are in no way guaranteed to be executed in case of failure. Adding even a small critical state component would complicate the server maintenance requirements substantially and would have a severe impact on the performance of the daemon. 

# SPECIFIC ADDITIONAL INFO FOR OHTU PROJECT

## toteutusympäristo / implementation environment 

* Ubuntu LTS 10.04 (and up)
* Preferably NodeJS servers (due to internal know-how and event-based runtime)

## erityisvaatimukset / requirements for participants

* Github account
* At least coding in english

## lisätietoja / additional info

* Do we need someone to specialize on the open source publishing and PR side?
* Is anyone interested in helping maintain this pro bono?
* 

## sopivat ajankohdat / possible timeframes

Which of these suit you?

 * 12.5. - 28.6.2014 (intensive)
 * 14.7. - 29.8.2014 (intensive)
 * 12.5.-29.8.2014
 * 1.9. -17.10.2014 (intensive)
 * 27.10. - 13.12.2014 (intensive)

