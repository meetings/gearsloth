#!/bin/bash

DOCKER=/usr/bin/docker.io

$DOCKER stop $($DOCKER ps -aq) 2> /dev/null || exit 0
$DOCKER rm $($DOCKER ps -aq)
