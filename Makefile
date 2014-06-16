REPORTER ?= dot
MOCHA_PARAMS ?= --recursive --ui tdd --reporter $(REPORTER)
MOCHA := ./node_modules/.bin/mocha
MOCHA_ALT := ./node_modules/.bin/_mocha
ISTANBUL := ./node_modules/.bin/istanbul

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
build: node_modules

.PHONY: test
test: node_modules
	$(MOCHA) $(MOCHA_PARAMS) test/

.PHONY: unit-test
unit-test: node_modules
	$(MOCHA) $(MOCHA_PARAMS) test/unit

.PHONY: e2e-test
e2e-test: node_modules
	$(MOCHA) $(MOCHA_PARAMS) test/e2e

.PHONY: blackbox-test
blackbox-test: $(GEARMAN_COFFEE)
	$(MOCHA) $(MOCHA_PARAMS) test/blackbox

.PHONY: coverage
coverage: node_modules
	-$(ISTANBUL) cover --report cobertura $(MOCHA_ALT) -- $(MOCHA_PARAMS) test/

.PHONY: html-coverage
html-coverage: coverage
	-$(ISTANBUL) report html

.PHONY: log-delayed
log-delayed: node_modules
	-@$(call start-local, ./examples/bin/log-delayed)

node_modules: package.json
	npm install
	touch $@

# Include docker.mk if available

ifneq ("$(wildcard docker.mk)","")
include docker.mk
else
.PHONY: clean-docker
clean-docker: ;
endif

.PHONY: clean
clean: clean-docker
	-rm -rf coverage
	-rm -rf node_modules
