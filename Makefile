REPORTER ?= dot
MOCHA_PARAMS ?= --recursive --ui tdd --reporter $(REPORTER)
MOCHA := ./node_modules/.bin/mocha
MOCHA_ALT := ./node_modules/.bin/_mocha
ISTANBUL := ./node_modules/.bin/istanbul

GEARMAN_COFFEE := node_modules/gearman-coffee/lib-js

# run local gearman server and gearsloth worker
define start-local
	FAIL=; GM_PID=; GS_PID=;\
	gearmand $(GEARMAN_PARAMS) 2> /dev/null & GM_PID=$$!;\
	./bin/gearslothd $(GEARSLOTH_PARAMS) & GS_PID=$$!;\
	$1 || FAIL=1;\
	[ ! -z $$GS_PID ] && kill $$GS_PID;\
	[ ! -z $$GM_PID ] && kill $$GM_PID;\
	[ -z $$FAIL ]
endef

.PHONY: build
build: $(GEARMAN_COFFEE)

.PHONY: test
test: $(GEARMAN_COFFEE)
	$(MOCHA) $(MOCHA_PARAMS) test/

.PHONY: unit-test
unit-test: $(GEARMAN_COFFEE)
	$(MOCHA) $(MOCHA_PARAMS) test/unit

.PHONY: e2e-test
e2e-test: $(GEARMAN_COFFEE)
	$(MOCHA) $(MOCHA_PARAMS) test/e2e

.PHONY: coverage
coverage: $(GEARMAN_COFFEE)
	-$(ISTANBUL) cover --report cobertura $(MOCHA_ALT) -- $(MOCHA_PARAMS) test/

.PHONY: html-coverage
html-coverage: coverage
	-$(ISTANBUL) report html

.PHONY: log-delayed
log-delayed: $(GEARMAN_COFFEE)
	-@$(call start-local, ./examples/bin/log-delayed)

$(GEARMAN_COFFEE): node_modules/gearman-coffee/node_modules/coffee-script
	cd node_modules/gearman-coffee; make
	touch $@

node_modules/gearman-coffee/node_modules/coffee-script: node_modules
	cd node_modules/gearman-coffee; npm install
	touch $@

node_modules: package.json
	npm install
	touch $@

.PHONY: build
build: node_modules

.PHONY: clean
clean:
	-rm -rf coverage
	-rm -rf node_modules
