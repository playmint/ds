
# configure path to unity
UNITY_EDITOR_VERSION := 2021.3.13f1
ifeq ($(OS),Windows_NT)
	UNITY_EDITOR := C:\Program Files\Unity\Hub\Editor\$(UNITY_EDITOR_VERSION)\Editor\Unity.exe
else
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Darwin)
		UNITY_EDITOR := /Applications/Unity/Hub/Editor/$(UNITY_EDITOR_VERSION)/Unity.app/Contents/MacOS/Unity
	else
		# Check if running under WSL
		ifneq ($(shell grep -i microsoft /proc/version),)
			UNITY_EDITOR := /mnt/c/Program\ Files/Unity/Hub/Editor/$(UNITY_EDITOR_VERSION)/Editor/Unity.exe
		else
			UNITY_EDITOR := /Applications/Unity/Hub/Editor/$(UNITY_EDITOR_VERSION)/Unity.app/Contents/Linux/Unity
		endif
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

contracts/src/maps/performance-test:
	$(NODE) ./scripts/generate-perf-test-map

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
	(cd cli && $(NPM) version patch && rm -rf /tmp/ds-cli && mkdir -p /tmp/ds-cli && cp -r dist /tmp/ds-cli/dist && jq 'del(.dependencies, .devDependencies)' package.json > /tmp/ds-cli/package.json && cd /tmp/ds-cli && $(NPM) publish)

deployments/garnet/contracts.json:
	(cd contracts && forge script script/Deploy.sol:GameDeployer \
		--broadcast \
		--rpc-url "https://rpc.garnetchain.com" \
		--ledger --mnemonic-indexes 0 --sender 0xfE4Aab053FED3cFbB7e5f6434e1585b4F17CC207 \
		-vvv)
	cp contracts/out/latest.json $@

deployments/garnet/contracts.yaml: deployments/garnet/contracts.json
	./scripts/genvalues deployments/garnet/contracts.json > $@

deploy-garnet: deployments/garnet/contracts.yaml
	bw login --check
	node ./scripts/get-latest-images.mjs | jq . > ./deployments/garnet/version.json
	helm upgrade --force --install --wait --timeout 30m --history-max 5 \
		ds ./chart -n garnet \
			--create-namespace\
			--values ./deployments/garnet/values.yaml \
			--values ./deployments/garnet/version.json \
			--values ./deployments/garnet/contracts.yaml \
			--set sequencer.privateKey=$$(bw get password da0f60df-2521-4fec-898a-b06800854c18)
	kubectl get po -n garnet

clean-garnet:
	rm -f deployments/garnet/contracts.json
	rm -f deployments/garnet/contracts.yaml
	rm -f deployments/garnet/version.json

deployments/redstone/contracts.json:
	(cd contracts && forge script script/Deploy.sol:GameDeployer \
		--broadcast \
		--rpc-url "https://rpc.redstonechain.com" \
		--ledger --mnemonic-indexes 0 --sender 0xfE4Aab053FED3cFbB7e5f6434e1585b4F17CC207 \
		-vvv)
	cp contracts/out/latest.json $@

deployments/redstone/contracts.yaml: deployments/redstone/contracts.json
	./scripts/genvalues deployments/redstone/contracts.json > $@

deploy-redstone: deployments/redstone/contracts.yaml
	bw login --check
	node ./scripts/get-latest-images.mjs | jq . > ./deployments/redstone/version.json
	helm upgrade --force --install --wait --timeout 30m --history-max 5 \
		ds ./chart -n redstone \
			--create-namespace\
			--values ./deployments/redstone/values.yaml \
			--values ./deployments/redstone/version.json \
			--values ./deployments/redstone/contracts.yaml \
			--set sequencer.privateKey=$$(bw get password da0f60df-2521-4fec-898a-b06800854c18)
	kubectl get po -n redstone

clean-redstone:
	rm -f deployments/redstone/contracts.json
	rm -f deployments/redstone/contracts.yaml
	rm -f deployments/redstone/version.json

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
	rm -rf node_modules
	rm -rf contracts/src/maps/performance-test
	$(MAKE) -C contracts/lib/cog/services clean


.PHONY: all clean dev map compose debugmap cli contracts release
.SILENT: contracts/lib/cog/services/bin/ds-node frontend/public/ds-unity/Build/ds-unity.wasm
