.PHONY: test
test: node_modules
	@gearmand -d > /dev/null 2>&1
	@node reverse.js &
	@echo client: `echo "reverse this" | gearman -f reverse`
	@pkill node
	@pkill gearmand

node_modules: package.json
	npm install
