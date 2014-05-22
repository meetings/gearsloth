#!/bin/bash

gearmand & GEARMAN_PID=$!
./bin/gearslothd & GEARSLOTH_PID=$!
./examples/bin/log-delayed
kill $GEARMAN_PID
kill $GEARSLOTH_PID
