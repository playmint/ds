

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
CORE_GRAPHQL_SRC := $(shell find core/src -name '*.graphql')
CORE_TS_SRC := $(shell find core/src -maxdepth 1 -name '*.ts')

# paths to tools
NODE := node
NPM := npm

all: node_modules contracts/lib/cog/services/bin/ds-node cli core/dist/core.js frontend/public/ds-unity/Build/ds-unity.wasm

map:
	$(UNITY_EDITOR) -batchmode -quit -projectPath ./map -executeMethod BuildScript.GitHubBuild -buildTarget WebGL -logFile -

debugmap:
	$(UNITY_EDITOR) -batchmode -quit -projectPath ./map -executeMethod BuildScript.DevBuild -buildTarget WebGL -logFile -

dev: all
	$(NODE) .devstartup.js

compose: frontend/public/ds-unity/Build/ds-unity.wasm
	docker compose up --build

contracts/out/Actions.sol/Actions.json:
	(cd contracts && forge build)

contracts:
	(cd contracts && forge build)

core: core/dist/core.js

core/dist/core.js: $(CORE_GRAPHQL_SRC) $(CORE_TS_SRC) contracts/out/Actions.sol/Actions.json
	(cd core && npm run build)

frontend/public/ds-unity/Build/ds-unity.wasm:
	$(MAKE) map

node_modules: package.json package-lock.json
	$(NPM) ci
	touch $@

contracts/lib/cog/services/bin/ds-node: contracts/lib/cog/services/Makefile $(COG_SERVICES_SRC)
	$(MAKE) -C contracts/lib/cog/services bin/ds-node

cli: node_modules core/dist/core.js
	(cd cli && $(NPM) run build && $(NPM) install -g --force .)

publish: cli
	(cd cli && $(NPM) version patch && $(NPM) publish)

release: contracts node_modules cli
	./scripts/release.mjs -i --max-connections 10

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
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf node_modules
	$(MAKE) -C contracts/lib/cog/services clean


.PHONY: all clean dev map compose debugmap cli contracts release
.SILENT: contracts/lib/cog/services/bin/ds-node frontend/public/ds-unity/Build/ds-unity.wasm
