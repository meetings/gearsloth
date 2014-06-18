# Dockerfile for Gearslothd

FROM ubuntu:trusty

RUN echo "deb http://archive.ubuntu.com/ubuntu trusty main universe" > /etc/apt/sources.list
RUN echo "deb http://archive.ubuntu.com/ubuntu trusty-updates main universe" >> /etc/apt/sources.list
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends \
    ca-certificates \
    git \
    make \
    nodejs \
    nodejs-legacy \
    npm

RUN mkdir /gearsloth
ADD ./package.json /gearsloth/
ADD ./Makefile /gearsloth/
ADD ./bin /gearsloth/bin
ADD ./lib /gearsloth/lib
RUN cd /gearsloth && \
    make build 2> /tmp/make.log
RUN echo '{ "db": "sqlite", "dbopt": { "db_name": "/var/lib/gearsloth/gearsloth.sqlite" } }' > /gearsloth/gearsloth.json
RUN ln -sf /gearsloth/bin/gearslothd /usr/local/bin/gearslothd

VOLUME ["/etc/gearsloth", "/var/lib/gearsloth"]

CMD ["gearslothd"]
