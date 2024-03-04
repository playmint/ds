#!/bin/bash

set -e
set -o pipefail

export NETWORK_ENDPOINT_HTTP="https://rpc.holesky.redstone.xyz"
export NETWORK_ENDPOINT_WS="wss://rpc.holesky.redstone.xyz/ws"
export CONTRACTS_JSON="redstone.json"

if [ -z $DEPLOYER_PRIVATE_KEY ]; then
    echo 'you must set DEPLOYER_PRIVATE_KEY env var to something with some redstone ETH'
    exit 1
fi

if [ -z $SEQUENCER_PRIVATE_KEY ]; then
    echo 'you must set SEQUENCER_PRIVATE_KEY env var to something with some redstone ETH'
    exit 1
fi

# deploy contracts if no contracts json
if [ -f "${CONTRACTS_JSON}" ]; then
    echo "using existing ${CONTRACTS_JSON} delete file to redeploy"
else
    echo "deploying contracts"
    (cd contracts && forge script script/Deploy.sol:GameDeployer \
        --broadcast \
        --rpc-url "${NETWORK_ENDPOINT_HTTP}" \
        --slow
    )
    cp "contracts/out/latest.json" "${CONTRACTS_JSON}"
fi

echo "using contracts at...."
jq . < "${CONTRACTS_JSON}"

# deploy chart to hexwood1
echo 'deploying chart...'
helm upgrade \
    ds ./chart \
    --timeout 15m \
    --history-max 5 \
    --install \
    --wait \
    --debug \
    --set "map=croissant" \
    --set "cluster.domain=downstream.game" \
    --set "version=hexwood0" \
    --set "priorityClassName=production" \
    --set "chainId=22301" \
    --set "anvil.enabled=false" \
    --set "sequencer.providerUrlHttp=${NETWORK_ENDPOINT_HTTP}" \
    --set "sequencer.providerUrlWs=${NETWORK_ENDPOINT_WS}" \
    --set "sequencer.privateKey=${SEQUENCER_PRIVATE_KEY}" \
    --set "sequencer.mineEmpty=false" \
    --set "indexer.providerUrlHttp=${NETWORK_ENDPOINT_HTTP}" \
    --set "indexer.providerUrlWs=${NETWORK_ENDPOINT_WS}" \
    --set "indexer.gameAddress=$(jq -r .game "${CONTRACTS_JSON}")" \
    --set "indexer.stateAddress=$(jq -r .state "${CONTRACTS_JSON}")" \
    --set "indexer.routerAddress=$(jq -r .router "${CONTRACTS_JSON}")" \
    --set "frontend.gameAddress=$(jq -r .game "${CONTRACTS_JSON}")" \
    --set "networkName=Redstone Holesky" \
    --set "networkID=17001" \
    --set "networkEndpoint=${NETWORK_ENDPOINT_HTTP}" \
    --create-namespace \
    -n hexwood1


# .... once it's up apply the map manually
echo 'done ... give it a little bit of time to startup and then....'
echo ""
echo 'run the following to setup the map:'
echo ""
echo "    ds apply -k ${DEPLOYER_PRIVATE_KEY} -n hexwood1 -R -f contracts/src/maps/croissant"
echo ""
echo 'run the following to watch the services logs:'
echo ""
echo '    kubectl logs -n hexwood1 -l app=ds-services --all-containers --tail=100000 -f'
echo ""
echo 'run the following to watch the tx arrive at the router:'
echo ""
echo "    open https://explorer.holesky.redstone.xyz/address/$(jq -r .router ${CONTRACTS_JSON})"
echo ""



