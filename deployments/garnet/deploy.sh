#/bin/bash

set -e
set -o pipefail

TAG="dev-$(date +%s)"

SERVICES_IMAGE="playmint/ds-services:${TAG}"
echo "BUILDING ${SERVICES_IMAGE}"
docker buildx build \
    -t "${SERVICES_IMAGE}" \
    --push \
    --platform linux/amd64,linux/arm64 \
    -f contracts/lib/cog/services/Dockerfile \
    contracts/lib/cog/services

FRONTEND_IMAGE="playmint/ds-shell:${TAG}"
echo "BUILDING ${FRONTEND_IMAGE}"
docker buildx build \
    -t "${FRONTEND_IMAGE}" \
    --push \
    --platform linux/amd64,linux/arm64 \
    -f frontend/Dockerfile \
    .

echo "DEPLOYING garnet.."
export EXTRA_ARGS="--set sequencer.image=${SERVICES_IMAGE} --set frontend.image=${FRONTEND_IMAGE}"
make deploy-garnet
