test: unit-test

unit-test:
		./node_modules/.bin/mocha --ui tdd

.PHONY: test unit-test
