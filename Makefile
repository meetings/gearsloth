test: unit-test e2e-test

.PHONY: unit-test
unit-test: node_modules
	./node_modules/.bin/mocha --ui tdd test/unit

# run local gearman server and gearsloth worker
define start-local
	gearmand -d > /dev/null 2>&1 && \
	(node gearsloth.js &) && \
	$1 ; \
	pkill node; \
	pkill gearmand;
endef

.PHONY: e2e-test
e2e-test: node_modules
	$(call start-local,\
		./node_modules/.bin/mocha --ui tdd test/e2e \
	)

.PHONY: log-delayed-test
log-delayed-test: node_modules
	$(call start-local,\
		(node log-worker.js &) && \
		node log-delayed-client.js && \
		sleep 2 \
	)

node_modules:
	npm install
