

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
UNITY_SRC := $(wildcard DawnSeekersUnity/**/*)

# paths to tools
NODE := node
NPM := npm

all: contracts/lib/cog/services/bin/ds-node contracts/lib/cog/services/bin/wait-for contracts/out/Actions.sol core/dist/src/index.js frontend/public/ds-unity/Build/ds-unity.wasm node_modules bridge/dist/index.js

dev: all
	$(NODE) .devstartup.js

contracts/out/Actions.sol:
	(cd contracts && forge build)

core/dist/src/index.js:
	(cd core && npm run build)

bridge/dist/index.js: core/dist/src/index.js
	(cd bridge && npm run build)

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

contracts/lib/cog/services/Makefile:
	git submodule update --init --recursive
	touch $@

contracts/lib/cog/services/bin/ds-node: contracts/lib/cog/services/Makefile
	$(MAKE) -C contracts/lib/cog/services bin/ds-node

contracts/lib/cog/services/bin/wait-for: contracts/lib/cog/services/Makefile
	$(MAKE) -C contracts/lib/cog/services bin/wait-for

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


.PHONY: all clean
