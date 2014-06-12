#!/bin/sh

cat >/etc/apt/sources.list <<EOL
deb http://archive.ubuntu.com/ubuntu trusty main universe
deb http://archive.ubuntu.com/ubuntu trusty-updates main universe
deb http://security.ubuntu.com/ubuntu trusty-security main universe
EOL

echo >/etc/apt/apt.conf.d/99translations <<EOL
Acquire::Languages "none";
EOL

export DEBIAN_FRONTEND=noninteractive

apt-get update || exit 1

apt-get install --yes --no-install-recommends \
  docker.io \
  gearman \
  git \
  mysql-client \
  nodejs \
  nodejs-legacy \
  npm \
  sqlite3

ln -sf /usr/bin/docker.io /usr/local/bin/docker
