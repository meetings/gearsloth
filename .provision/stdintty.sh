#!/bin/sh
sed -i 's/^mesg n/tty -s \&\& mesg n/' /root/.profile
