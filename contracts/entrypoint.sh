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

# optional anvil args
ANVIL_ARGS=${EXTRA_ANVIL_ARGS:-""}

echo "+-------------------+"
echo "| starting evm node |"
echo "+-------------------+"
anvil \
    --block-base-fee-per-gas 1 \
    --block-time 2 \
	--host 0.0.0.0 \
    --chain-id "${CHAIN_ID}" \
	-m "${ACCOUNT_MNEMONIC}" \
    ${ANVIL_ARGS} \
	&


echo "+---------------------+"
echo "| deploying contracts |"
echo "+---------------------+"
while ! curl -sf -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' localhost:8545 >/dev/null; do
	echo "waiting for evm node to respond..."
	sleep 1
done

# theres a race where anvil is not quite ready to deploy to
# FIXME: we need a better way than checking the eth_blockNumber response as a readyness check
sleep 2


forge script script/Deploy.sol:GameDeployer --broadcast --rpc-url "http://localhost:8545" --private-key "${DEPLOYER_PRIVATE_KEY}"

echo "+-------+"
echo "| ready |"
echo "+-------+"
echo ""


# wait and bail if either migration or evm node crash
wait -n
exit $?
