

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

all: node_modules contracts/lib/cog/services/bin/ds-node contracts/out/Actions.sol/Actions.json core/dist/core.js frontend/public/ds-unity/Build/ds-unity.wasm bridge/dist/index.js

map:
	$(UNITY_EDITOR) -batchmode -quit -projectPath ./DawnSeekersUnity -executeMethod BuildScript.GitHubBuild -buildTarget WebGL -logFile - 

dev: all
	$(NODE) .devstartup.js

contracts/out/Actions.sol/Actions.json:
	(cd contracts && forge build)

core/dist/core.js: $(CORE_SRC)
	(cd core && npm run build)

bridge/dist/index.js: core/dist/core.js bridge/src/index.ts
	(cd bridge && npm run build)

frontend/public/ds-unity/Build/ds-unity.wasm:
	$(MAKE) map

node_modules: package.json package-lock.json
	$(NPM) install
	touch $@

contracts/lib/cog/services/bin/ds-node: contracts/lib/cog/services/Makefile $(COG_SERVICES_SRC)
	$(MAKE) -C contracts/lib/cog/services bin/ds-node

clean:
	rm -rf frontend/public/ds-unity
	rm -f contracts/lib/cog/services/bin/ds-node
	rm -rf contracts/out
	rm -rf core/dist
	rm -rf bridge/dist
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf core/node_modules
	rm -rf core/src/gql
	rm -rf bridge/node_modules
	rm -rf node_modules
	$(MAKE) -C contracts/lib/cog/services clean


.PHONY: all clean dev map
.SILENT: contracts/lib/cog/services/bin/ds-node frontend/public/ds-unity/Build/ds-unity.wasm
