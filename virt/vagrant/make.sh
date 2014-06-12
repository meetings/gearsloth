#!/bin/bash
# Take a clean snapshot of the git repository for testing.

DIR=$HOME/gearsloth

mkdir -p $DIR
git clone /vagrant gearsloth

cd $DIR && make build build-docker 2> /tmp/make.log
