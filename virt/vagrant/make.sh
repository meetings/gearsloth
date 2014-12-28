#!/bin/bash
# Take a clean snapshot of the git repository for testing.

DIR=$HOME/gearsloth

git clone /vagrant $DIR

if [ ! -e /vagrant/enable.docker ]; then
  echo
  echo To build Docker containers, touch enable.docker
  echo in project root.
  echo
  exit 0
fi

cd $DIR && sudo sg docker -c 'make all 2> /tmp/make.log'
