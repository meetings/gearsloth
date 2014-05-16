REPORTER ?= dot
MOCHA_PARAMS ?= --recursive --ui tdd --reporter $(REPORTER)
MOCHA := ./node_modules/.bin/mocha
MOCHA_ALT := ./node_modules/.bin/_mocha
ISTANBUL := ./node_modules/.bin/istanbul

# run local gearman server and gearsloth worker
define start-local
	GM_EXISTS=; FAIL=; GS_PID=; \
	pgrep gearmand > /dev/null && GM_EXISTS=1 ; \
	[ -z $$GM_EXISTS ] && gearmand -d > /dev/null 2>&1 ; \
	node gearslothd.js & GS_PID=$$!; $1 || FAIL=1 ; \
	[ ! -z $$GS_PID ] && kill $$GS_PID; \
	[ -z $$GM_EXISTS ] && pkill gearmand ; \
	[ -z $$FAIL ]
endef

.PHONY: test
test: node_modules
	$(call start-local, $(MOCHA) $(MOCHA_PARAMS))

.PHONY: unit-test
unit-test: node_modules
	$(MOCHA) $(MOCHA_PARAMS) test/unit

.PHONY: e2e-test
e2e-test: node_modules
	$(call start-local, $(MOCHA) $(MOCHA_PARAMS) test/e2e)

.PHONY: coverage
coverage: node_modules
	-$(call start-local, $(ISTANBUL) cover --report cobertura $(MOCHA_ALT) -- $(MOCHA_PARAMS) test/)

.PHONY: log-delayed-test
log-delayed-test: node_modules
	$(call start-local,\
		node ./examples/log-worker.js & GW_PID=$$!; \
		node ./examples/log-delayed-client.js ; \
		sleep 2 ; \
		kill $$GW_PID \
	)

node_modules: package.json
	npm install

.PHONY: clean
clean:
	-rm -r coverage
	-rm -r node_modules
