#!/bin/bash

set -eu
set -o pipefail

# this file is used by the docker-compose setup
# as a way of getting a chain with the contracts deployed

_term() {
  echo "Terminated by user!"
  exit 1
}
trap _term SIGINT
trap _term SIGTERM

# remove any existing deployments for clean start
mkdir -p deployments
rm -f deployments/*

# must match the value for the target hardhat networks
ACCOUNT_MNEMONIC="thunder road vendor cradle rigid subway isolate ridge feel illegal whale lens"

echo "+-------------------+"
echo "| starting evm node |"
echo "+-------------------+"
anvil \
    --block-base-fee-per-gas 1 \
    --block-time 2 \
    --transaction-block-keeper 25 \
    --prune-history \
	--host 0.0.0.0 \
	-m "${ACCOUNT_MNEMONIC}" \
	&


echo "+---------------------+"
echo "| deploying contracts |"
echo "+---------------------+"
while ! curl -sf -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' localhost:8545 >/dev/null; do
	echo "waiting for evm node to respond..."
	sleep 1
done
forge script script/Deploy.sol:GameDeployer --broadcast --rpc-url "http://localhost:8545" --slow

echo "+---------------------+"
echo "| deploying fixtures  |"
echo "+---------------------+"
SERVICES_HTTP=${SERVICES_URL_HTTP:-"http://localhost:8080/query"}
SERVICES_WS=${SERVICES_URL_WS:-"ws://localhost:8080/query"}
while ! curl -sf -X GET "${SERVICES_HTTP}" >/dev/null; do
	echo "waiting for services to respond..."
	sleep 1
done
echo "waiting for services to settle..."
sleep 5
echo "ds apply..."
ds -k "${DEPLOYER_PRIVATE_KEY}" -n local --ws-endpoint="${SERVICES_WS}" --http-endpoint="${SERVICES_HTTP}" apply -R -f ./src/fixtures

echo "+-------+"
echo "| ready |"
echo "+-------+"
echo ""


# wait and bail if either migration or evm node crash
wait -n
exit $?
