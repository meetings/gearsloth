# Docker image build targets

# User needs to have administrator privileges or be a member of group 'docker'

DOCKER := docker
IMAGE_PREFIX := meetings
BUILD_DIR := docker
VIRT_DIR := virt
GEARSLOTHD_IMAGE := gearslothd
MARKER_PREFIX := docker-
MARKER_BUILD_PREFIX := $(BUILD_DIR)/$(MARKER_PREFIX)

VIRT_IMAGES := gearmand mysql

GEARSLOTHD_MARKER := $(MARKER_BUILD_PREFIX)$(GEARSLOTHD_IMAGE)
MARKERS := $(addprefix $(MARKER_BUILD_PREFIX),$(VIRT_IMAGES))
MARKER_TARGETS := $(addprefix $(IMAGE_PREFIX)/,$(GEARSLOTHD_IMAGE) \
	$(VIRT_IMAGES))
DOCKER_MARKERS := $(GEARSLOTHD_MARKER) $(MARKERS)

# Source files for running gearslothd daemon

GEARSLOTHD_SRC := package.json $(shell find bin lib -type f)

.PHONY: docker-test
docker-test: node_modules $(DOCKER_MARKERS)
	$(MOCHA) $(MOCHA_PARAMS) test/docker

.PHONY: build-docker
build-docker: $(DOCKER_MARKERS)

# convenient phony docker image targets
# eg. meetings/gearslothd

.PHONY: $(MARKER_TARGETS)
$(MARKER_TARGETS): $(IMAGE_PREFIX)/%: $(MARKER_BUILD_PREFIX)%

# Gearslothd docker image

$(GEARSLOTHD_MARKER): Dockerfile $(GEARSLOTHD_SRC) $(BUILD_DIR)
	$(DOCKER) build -t $(IMAGE_PREFIX)/$(GEARSLOTHD_IMAGE) .
	touch $@

# Other custom images under $(VIRT_DIR)
# eg. docker/docker-gearmand

.SECONDEXPANSION:

$(MARKERS): $(MARKER_BUILD_PREFIX)%: $$(wildcard $(VIRT_DIR)/%/*) $(BUILD_DIR)
	$(DOCKER) build -t $(IMAGE_PREFIX)/$* $(VIRT_DIR)/$*
	touch $@

$(BUILD_DIR):
	mkdir -p $@
	touch $(DOCKER_MARKERS)
	touch $@

# Remove image markers, but leave actual images

.PHONY: clean-docker
clean-docker:
	rm -rf $(BUILD_DIR)
