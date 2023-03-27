#!/bin/bash

set -eu
set -o pipefail

# this is a entrypoint for a dockerized hardhat evm node
# it starts the hardhat node, runs our deployment scripts
# builds the required deployment confgiuration
# it is used for local development

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

# set blocktime - sometimes it is useful to simulate slower mining
: ${MINER_BLOCKTIME:=0}

echo "+-------------------+"
echo "| starting evm node |"
echo "+-------------------+"
anvil \
	--host 0.0.0.0 \
	-m "${ACCOUNT_MNEMONIC}" \
	-b 5 \
	&

# wait for node to start
while ! curl -sf -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' localhost:8545 >/dev/null; do
	echo "waiting for evm node to start..."
	sleep 1
done

echo "+---------------------+"
echo "| deploying contracts |"
echo "+---------------------+"
forge script script/Deploy.sol:GameDeployer --broadcast --rpc-url "http://localhost:8545"

echo "+-------+"
echo "| ready |"
echo "+-------+"
echo ""


# wait and bail if either migration or evm node crash
wait -n
exit $?
