#!/bin/bash

_usage() {
  echo "Available arguments:"
  echo " 1 - Multi-master mysql configuration 1"
  echo " 2 - Multi-master mysql configuration 2"
  echo " S - Shell only"
}

if [ -z "$1" ]; then
  _usage
  exit 0
elif [[ $1 =~ ^[sS] ]]; then
  exec /bin/bash
elif [ -f /etc/mysql/src/multi-master.cnf.$1 ]; then
  cat /etc/mysql/src/multi-master.cnf.$1 > /etc/mysql/conf.d/multi-master.cnf
else
  _usage
  exit 1
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
