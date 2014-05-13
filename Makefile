test: unit-test

unit-test:
		./node_modules/.bin/mocha --ui tdd

.PHONY: reverse-test
reverse-test: reverse-test-cli reverse-test-js

.PHONY: reverse-test-cli
reverse-test-cli:
	@gearmand -d > /dev/null 2>&1
	@node reverse.js &
	@echo client: `echo "reverse this" | gearman -f reverse`
	@pkill node
	@pkill gearmand

.PHONY: reverse-test-js
reverse-test-js:
	@gearmand -d > /dev/null 2>&1
	@node reverse.js &
	@echo client: `node reverse-client.js`
	@pkill node
	@pkill gearmand

.PHONY: test unit-test
