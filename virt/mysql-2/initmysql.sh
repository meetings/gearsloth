#!/bin/bash

/usr/bin/mysqld_safe &
sleep 3

mysql < /db.sql

while :; do sleep 99; done
