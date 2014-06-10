# Dockerfile for Gearman

FROM ubuntu:trusty

RUN echo "deb http://archive.ubuntu.com/ubuntu trusty main universe" > /etc/apt/sources.list
RUN echo "deb http://archive.ubuntu.com/ubuntu trusty-updates main universe" >> /etc/apt/sources.list
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends gearman

ADD init.sh            /
ADD gearman-job-server /etc/default/

EXPOSE 4730

ENTRYPOINT ["/init.sh"]
