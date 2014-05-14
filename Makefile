test: unit-test

unit-test:
	./node_modules/.bin/mocha --ui tdd

.PHONY: reverse-test
reverse-test: reverse-test-cli reverse-test-js

.PHONY: reverse-test-cli
reverse-test-cli: node_modules
	@gearmand -d > /dev/null 2>&1
	@node reverse.js &
	@echo client: `echo "kitteh" | gearman -f reverse`
	@pkill node
	@pkill gearmand

.PHONY: reverse-test-js
reverse-test-js: node_modules
	@gearmand -d > /dev/null 2>&1
	@node reverse.js &
	@echo client: `node reverse-client.js`
	@pkill node
	@pkill gearmand

.PHONY: log-delayed-test
log-delayed-test: node_modules
	@gearmand -d > /dev/null 2>&1
	@node log-worker.js &
	@node gearsloth.js &
	@node log-delayed-client.js
	@sleep 2
	@pkill node
	@pkill gearmand

node_modules:
	npm install

.PHONY: test unit-test
