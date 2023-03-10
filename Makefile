

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

all: contracts/lib/cog/services/bin/ds-node contracts/lib/cog/services/bin/wait-for frontend/public/ds-unity/Build/ds-unity.wasm node_modules

dev: all
	$(NODE) .devstartup.js

frontend/public/ds-unity/Build/ds-unity.wasm: $(UNITY_SRC)
	$(UNITY_EDITOR) -batchmode -quit -projectPath ./DawnSeekersUnity -executeMethod BuildScript.GitHubBuild -buildTarget WebGL -logFile -

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


.PHONY: all clean
