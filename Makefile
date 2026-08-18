# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

BANNER = A Z K E N A

SHELL = /bin/bash -o pipefail

DIR = $(shell pwd)

# Colors for terminal output
NO_COLOR=\033[0m
OK_COLOR=\033[32;01m
ERROR_COLOR=\033[31;01m
WARN_COLOR=\033[33;01m
INFO_COLOR=\033[36m
WHITE_COLOR=\033[1m
MAKE_COLOR=\033[33;01m%-20s\033[0m

.DEFAULT_GOAL := help

# Define common messages
# OK=[✅]
# KO=[🔴]
# WARN=[⚠️]
# INFO=[🔵]
OK=[🟢]
KO=[🔴]
WARN=[🟠]
INFO=[🔵]


.PHONY: help
help:
	@echo -e "$(OK_COLOR)      $(BANNER)$(NO_COLOR)"
	@echo "------------------------------------------------------------------"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make ${INFO_COLOR}<target>${NO_COLOR}\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  ${INFO_COLOR}%-25s${NO_COLOR} %s\n", $$1, $$2 } /^##@/ { printf "\n${WHITE_COLOR}%s${NO_COLOR}\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""

guard-%:
	@if [ "${${*}}" = "" ]; then \
		echo -e "$(ERROR_COLOR)Environment variable $* not set$(NO_COLOR)"; \
		exit 1; \
	fi

check-%:
	@if $$(hash $* 2> /dev/null); then \
		echo -e "$(OK_COLOR)$(OK)$(NO_COLOR) $*"; \
	else \
		echo -e "$(ERROR_COLOR)$(KO)$(NO_COLOR) $*"; \
	fi

##@ Development

.PHONY: install
install: ## Install dependencies
	@echo -e "$(INFO)$(INFO_COLOR)[Install] Installing dependencies$(NO_COLOR)"
	npm install

.PHONY: dev
dev: ## Start local dev server (wrangler dev)
	@echo -e "$(INFO)$(INFO_COLOR)[Dev] Starting Cloudflare Worker$(NO_COLOR)"
	bunx wrangler dev

.PHONY: build
build: ## Type-check with tsc
	@echo -e "$(INFO)$(INFO_COLOR)[Build] Type checking$(NO_COLOR)"
	npx tsc --noEmit

.PHONY: test
test: ## Run tests
	@echo -e "$(INFO)$(INFO_COLOR)[Test] Running vitest$(NO_COLOR)"
	npx vitest

.PHONY: lint
lint: ## Run dprint linter
	@echo -e "$(INFO)$(INFO_COLOR)[Lint] Running dprint$(NO_COLOR)"
	bunx dprint check

.PHONY: fmt
fmt: ## Format with dprint
	@echo -e "$(INFO)$(INFO_COLOR)[Format] Running dprint$(NO_COLOR)"
	bunx dprint fmt

##@ Deployment

.PHONY: deploy
deploy: ## Deploy to production
	@echo -e "$(INFO)$(INFO_COLOR)[Deploy] Deploying to production$(NO_COLOR)"
	bunx wrangler deploy --env production

.PHONY: deploy-staging
deploy-staging: ## Deploy to staging
	@echo -e "$(INFO)$(INFO_COLOR)[Deploy] Deploying to staging$(NO_COLOR)"
	bunx wrangler deploy --env staging

.PHONY: logs
logs: ## Tail live worker logs
	bunx wrangler tail

##@ Maintenance

.PHONY: clean
clean: ## Clean project
	@echo -e "$(INFO)$(INFO_COLOR)[Clean] Processing $(NO_COLOR)"
	rm -rf node_modules dist .wrangler
