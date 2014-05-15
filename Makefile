REPORTER ?= dot
MOCHA := ./node_modules/.bin/mocha --recursive --ui tdd --reporter $(REPORTER)

# run local gearman server and gearsloth worker
define start-local
	GM_EXISTS=; FAIL=; \
	pgrep gearmand > /dev/null && GM_EXISTS=1 ; \
	[ -z $$GM_EXISTS ] && gearmand -d > /dev/null 2>&1 ; \
	(node gearsloth.js &) && $1 || FAIL=1 ; \
	pkill node; \
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

.PHONY: log-delayed-test
log-delayed-test: node_modules
	@$(call start-local,\
		(node log-worker.js &) && \
		node log-delayed-client.js && \
		sleep 2 \
	)

node_modules:
	npm install
