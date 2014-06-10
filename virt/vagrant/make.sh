#!/bin/bash
# Take a clean snapshot of the git repository for testing.

DIR=$HOME/gearsloth

mkdir -p $DIR || exit 1
cd /vagrant && git archive master | tar -xC $DIR

cd $DIR && make build 2> /tmp/make.log
