#!/bin/bash

DOCKER=/usr/bin/docker.io

for FILE in /vagrant/virt/*/Dockerfile; do
  DIR=$(dirname $FILE)
  TAG=$(basename $DIR)

  $DOCKER build -t $TAG $DIR
done
