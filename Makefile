

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
UNITY_SRC := $(wildcard DawnSeekersUnity/**/*.cs)

# cog srcs
COG_SERVICES_SRC := $(wildcard contracts/lib/cog/services/**/*.go)

# paths to tools
NODE := node
NPM := npm

all: node_modules contracts/lib/cog/services/bin/ds-node contracts/out/Actions.sol core/dist/core.js frontend/public/ds-unity/Build/ds-unity.wasm bridge/dist/index.js

dev: all
	$(NODE) .devstartup.js

contracts/out/Actions.sol:
	(cd contracts && forge build)

core/dist/core.js: $(wildcard core/src/**/*)
	(cd core && npm run build)

bridge/dist/index.js: core/dist/core.js
	echo "FIXME: don't commit this"
	echo "(cd bridge && npm run build)"

frontend/public/ds-unity/Build/ds-unity.wasm: $(UNITY_SRC)
	$(UNITY_EDITOR) -batchmode -quit -projectPath ./DawnSeekersUnity -executeMethod BuildScript.GitHubBuild -buildTarget WebGL -logFile - || ( \
		if [ -f "$@" ]; then \
			echo; \
			echo "------------------------------------------------------------------------------------"; \
			echo "Failed to build the WebGL map, but looks like you have an old version built already"; \
			echo "------------------------------------------------------------------------------------"; \
			echo; \
			echo "Continue with your previous map build? [Y/n]: "; \
			echo; \
			read line; if [[ $$line == "n" ]]; then \
				echo "ERROR: failed to build map"; \
				echo; \
				exit 1; \
			else \
				echo "WARNING: using stale map build!"; \
				echo; \
			fi \
		else \
			echo "ERROR: failed to build map and no previous version found"; \
		fi \
	)

node_modules: package.json package-lock.json
	$(NPM) ci
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


.PHONY: all clean dev
.SILENT: contracts/lib/cog/services/bin/ds-node
