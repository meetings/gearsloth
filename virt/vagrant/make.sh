#!/bin/bash
# Take a clean snapshot of the git repository for testing.

DIR=$HOME/gearsloth

mkdir -p $DIR
git clone /vagrant gearsloth

cd $DIR && sg docker -c 'make all 2> /tmp/make.log'
