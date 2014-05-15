REPORTER ?= dot
MOCHA := ./node_modules/.bin/mocha --recursive --ui tdd --reporter $(REPORTER)

# run local gearman server and gearsloth worker
define start-local
	GM_EXISTS=; FAIL=; GS_PID=; \
	pgrep gearmand > /dev/null && GM_EXISTS=1 ; \
	[ -z $$GM_EXISTS ] && gearmand -d > /dev/null 2>&1 ; \
	node gearsloth.js & GS_PID=$$!; $1 || FAIL=1 ; \
	[ ! -z $$GS_PID ] && kill $$GS_PID; \
	[ -z $$GM_EXISTS ] && pkill gearmand ; \
	[ -z $$FAIL ]
endef

.PHONY: test
test: node_modules
	$(call start-local, $(MOCHA))

.PHONY: unit-test
unit-test: node_modules
	$(MOCHA) test/unit

.PHONY: e2e-test
e2e-test: node_modules
	$(call start-local, $(MOCHA) test/e2e)

.PHONY: ./examples/log-delayed-test
./examples/log-delayed-test: node_modules
	$(call start-local,\
		node log-worker.js & GW_PID=$$!; \
		node log-delayed-client.js ; \
		sleep 2 ; \
		kill $$GW_PID \
	)

node_modules:
	npm install
