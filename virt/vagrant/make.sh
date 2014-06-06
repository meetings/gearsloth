#!/bin/bash
GEARSLOTH_PATH=$HOME/gearsloth
mkdir -p $GEARSLOTH_PATH
git clone /vagrant $GEARSLOTH_PATH
cd $GEARSLOTH_PATH
make build
