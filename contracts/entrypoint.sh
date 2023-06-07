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
	--host 0.0.0.0 \
	-m "${ACCOUNT_MNEMONIC}" \
    --code-size-limit 9999999999999 \
    --gas-limit 9999999999999999 \
    --block-time 2 \
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
