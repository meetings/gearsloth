# Dockerfile for a Mysql installation

FROM ubuntu:trusty

RUN echo "deb http://archive.ubuntu.com/ubuntu trusty main universe" > /etc/apt/sources.list
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends mysql-server

ADD initmysql.sh            /initmysql.sh
ADD conf/my.cnf             /etc/mysql/my.cnf
ADD conf/multi-master.cnf.1 /etc/mysql/src/multi-master.cnf.1
ADD conf/multi-master.cnf.2 /etc/mysql/src/multi-master.cnf.2
ADD conf/mysqld_charset.cnf /etc/mysql/conf.d/mysqld_charset.cnf

EXPOSE 3306

ENTRYPOINT ["/initmysql.sh"]
