#!/bin/bash

# Docker binary path.
#
DOCKER=/usr/bin/docker.io

# Master file position is queried, but for simplicity,
# let's assume the binary log file does not change
# before setting up multi-master setup.
#
ASSUMED_FILE=mysql-bin.000001

echo Starting 1st container...
ID_ONE=$($DOCKER run -d mysql-1); sleep 2

echo Starting 2nd container...
ID_TWO=$($DOCKER run -d mysql-2); sleep 2

IP_ONE=$($DOCKER inspect -f "{{.NetworkSettings.IPAddress}}" $ID_ONE)
IP_TWO=$($DOCKER inspect -f "{{.NetworkSettings.IPAddress}}" $ID_TWO)

echo "> $IP_ONE $ID_ONE"
echo "> $IP_TWO $ID_TWO"

sleep 2 ## If mysqld is not ready yet, increase this value.

MASTER_POS_ONE=$(mysql -h $IP_ONE -u sloth -e "SHOW MASTER STATUS\G" | awk '/Position/ {print $2}')

mysql -h $IP_TWO -u sloth -e "CHANGE MASTER TO master_host='$IP_ONE', master_port=3306, master_user='replication', master_password='replication', master_log_file='$ASSUMED_FILE', master_log_pos=$MASTER_POS_ONE"

MASTER_POS_TWO=$(mysql -h $IP_TWO -u sloth -e "SHOW MASTER STATUS\G" | awk '/Position/ {print $2}')

mysql -h $IP_ONE -u sloth -e "CHANGE MASTER TO master_host='$IP_TWO', master_port=3306, master_user='replication', master_password='replication', master_log_file='$ASSUMED_FILE', master_log_pos=$MASTER_POS_TWO"

mysql -h $IP_ONE -u sloth -e "START SLAVE"
mysql -h $IP_TWO -u sloth -e "START SLAVE"

exit 0
