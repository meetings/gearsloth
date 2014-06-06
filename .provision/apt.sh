#!/bin/sh
echo 'Acquire::Languages "none";' > /etc/apt/apt.conf.d/99translations
apt-get update
apt-get install --yes --no-install-recommends gearman npm nodejs-legacy sqlite \
  git
