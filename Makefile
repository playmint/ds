

# configure path to unity
UNITY_EDITOR_VERSION := 2021.3.13f1
ifeq ($(OS),Windows_NT)
	UNITY_EDITOR := C:\Program Files\Unity\Hub\Editor\$(UNITY_EDITOR_VERSION)\Editor\Unity.exe
else
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	UNITY_EDITOR := /Applications/Unity/Hub/Editor/$(UNITY_EDITOR_VERSION)/Unity.app/Contents/MacOS/Unity
else
	UNITY_EDITOR := /Applications/Unity/Hub/Editor/$(UNITY_EDITOR_VERSION)/Unity.app/Contents/Linux/Unity
endif
endif

# srcs
COG_SERVICES_SRC := $(shell find contracts/lib/cog/services -name '*.go')
CORE_SRC := $(shell find core/src)

# paths to tools
NODE := node
NPM := npm

all: node_modules contracts/lib/cog/services/bin/ds-node cli core/dist/core.js frontend/public/ds-unity/Build/ds-unity.wasm

map:
	$(UNITY_EDITOR) -batchmode -quit -projectPath ./map -executeMethod BuildScript.GitHubBuild -buildTarget WebGL -logFile -

debugmap:
	$(UNITY_EDITOR) -batchmode -quit -projectPath ./map -executeMethod BuildScript.DevBuild -buildTarget WebGL -logFile -

dev: all docs
	$(NODE) .devstartup.js

compose: frontend/public/ds-unity/Build/ds-unity.wasm
	docker compose up --build

contracts/out/Actions.sol/Actions.json:
	(cd contracts && forge build)

contracts:
	(cd contracts && forge build)

core/src/gql:
	# noop

core/dist/core.js: $(CORE_SRC) contracts/out/Actions.sol/Actions.json 
	(cd core && npm run build)

frontend/public/ds-unity/Build/ds-unity.wasm:
	$(MAKE) map

node_modules: package.json package-lock.json
	$(NPM) install
	touch $@

contracts/lib/cog/services/bin/ds-node: contracts/lib/cog/services/Makefile $(COG_SERVICES_SRC)
	$(MAKE) -C contracts/lib/cog/services bin/ds-node

cli: node_modules core/dist/core.js
	(cd cli && npm run build && npm install -g --force .)

docs/node_modules: docs/package.json docs/package-lock.json
	(cd docs && npm ci)

docs: docs/node_modules

publish: cli
	(cd cli && npm version patch && npm publish)

release: contracts node_modules cli
	./scripts/release.mjs -i


clean:
	rm -rf cli/dist
	rm -rf cli/node_modules
	rm -f  contracts/lib/cog/services/bin/ds-node
	rm -rf contracts/out
	rm -rf contracts/broadcast
	rm -rf contracts/cache
	rm -rf core/dist
	rm -rf core/src/gql
	rm -rf core/src/abi
	rm -rf core/node_modules
	rm -f  frontend/public/ds-unity/Build/ds-unity.wasm
	rm -rf frontend/public/ds-unity
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf docs/node_modules
	rm -rf docs/.docusaurus
	rm -rf docs/build
	rm -rf node_modules
	$(MAKE) -C contracts/lib/cog/services clean


.PHONY: all clean dev docs map compose debugmap cli contracts release
.SILENT: contracts/lib/cog/services/bin/ds-node frontend/public/ds-unity/Build/ds-unity.wasm
