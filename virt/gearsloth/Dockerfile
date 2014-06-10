# Dockerfile for Gearsloth

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

RUN cd /tmp && \
    git clone https://github.com/meetings/gearsloth.git && \
    cd gearsloth && \
    make build 2> /tmp/make.log

ENTRYPOINT ["/tmp/gearsloth/bin/gearslothd"]

CMD ["--help"]
