#!/bin/bash

if [ -z "$1" ]; then
  echo No multi-master configuration given,
  echo dropping to shell
  exec /bin/bash
fi

if [ -f /etc/mysql/src/multi-master.cnf.$1 ]; then
  echo Choosing multi-master configuration $1
  cat /etc/mysql/src/multi-master.cnf.1 > /etc/mysql/conf.d/multi-master.cnf
fi

/usr/bin/mysqld_safe &

RETRY=1

while [ $RETRY -ne 0 ]; do
  sleep 2
  mysql -u root -e STATUS &> /dev/null
  RETRY=$?
done

mysql -u root -e "GRANT REPLICATION SLAVE ON *.* TO 'replication'@'%' IDENTIFIED BY 'replication'"
mysql -u root -e "GRANT ALL PRIVILEGES ON *.* TO 'sloth'@'%' WITH GRANT OPTION"
mysql -u root -e "FLUSH PRIVILEGES"

while :; do sleep 99; done
