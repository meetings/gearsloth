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

.PHONY: help
help:
	@echo 'Cleaning targets:'
	@echo '  clean               - Remove all generated files'
	@echo '                        (node_modules + coverage + docker directories)'
	@echo '  clean-docker        - Remove docker marker files (docker directory)'
	@echo ''
	@echo 'Test targets:'
	@echo '  test                - Run all tests that do not require docker'
	@echo '                        images (unit + e2e + blackbox)'
	@echo '  unit-test           - Run unit tests'
	@echo '  e2e-test            - Run end-to-end tests'
	@echo '  blackbox-test       - Run blackbox tests'
	@echo '  docker-test         - Run tests requiring docker containers'
	@echo '  coverage            - Generate cobertura test coverage reports'
	@echo '                        (runs all tests)'
	@echo '  html-coverage       - Generate cobertura html reports'
	@echo ''
	@echo 'Build targets:'
	@echo '  build               - Generate everything except docker images'
	@echo '  build-docker        - Generate docker images'
	@echo '  all                 - Generate everything, including docker images'
	@echo '  meetings/gearmand   - Generate gearmand docker image'
	@echo '  meetings/gearslothd - Generate gearslothd docker image'
	@echo '  meetings/mysql      - Generate mysql docker image'
	@echo ''
	@echo 'Other targets:'
	@echo '  log-delayed         - Run a simple log example'
	@echo ''
	@echo 'For further info see the ./README.md file'

.PHONY: test
test: node_modules
	$(MOCHA) $(MOCHA_PARAMS) test/blackbox test/e2e test/unit

.PHONY: unit-test
unit-test: node_modules
	$(MOCHA) $(MOCHA_PARAMS) test/unit

.PHONY: e2e-test
e2e-test: node_modules
	$(MOCHA) $(MOCHA_PARAMS) test/e2e

.PHONY: blackbox-test
blackbox-test: node_modules
	$(MOCHA) $(MOCHA_PARAMS) test/blackbox

.PHONY: log-delayed
log-delayed: node_modules
	-@$(call start-local, ./examples/bin/log-delayed)

node_modules: package.json
	npm install
	touch $@

# Include docker.mk if available

.PHONY: test-all all
ifneq ("$(wildcard docker.mk)","")
include docker.mk
test-all: node_modules $(DOCKER_MARKERS)
	$(MOCHA) $(MOCHA_PARAMS) test
all: build build-docker
else
.PHONY: clean-docker
clean-docker: ;
test-all: test
all: build
endif

.PHONY: coverage
coverage: node_modules $(DOCKER_MARKERS)
	-@$(ISTANBUL) cover --report cobertura $(MOCHA_ALT) -- $(MOCHA_PARAMS) test

.PHONY: html-coverage
html-coverage: coverage
	-@$(ISTANBUL) report html

.PHONY: clean
clean: clean-docker
	-rm -rf coverage
	-rm -rf node_modules
