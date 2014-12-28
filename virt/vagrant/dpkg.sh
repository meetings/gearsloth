#!/bin/sh

set -e

if [ ! -e /vagrant/enable.dpkg ]; then
  echo
  echo To enable building Gearsloth debian package,
  echo touch enable.dpkg in project root.
  echo
  exit 0
fi

export DEBIAN_FRONTEND=noninteractive

apt-get install --yes --no-install-recommends build-essential debhelper
