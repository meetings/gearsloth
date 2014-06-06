# Dockerfile for a Mysql installation

FROM ubuntu:trusty

RUN echo "deb http://archive.ubuntu.com/ubuntu trusty main universe" > /etc/apt/sources.list
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends mysql-server

ADD mysql        /etc/mysql/
ADD initmysql.sh /
ADD db.sql       /

EXPOSE 3306

ENTRYPOINT ["/initmysql.sh"]
