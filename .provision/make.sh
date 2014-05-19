#!/bin/sh
cd /vagrant || exit 1
make clean
make build
