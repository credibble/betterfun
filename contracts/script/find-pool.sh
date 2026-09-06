#!/bin/bash
export PATH="$PATH:/home/devarogundade/.foundry/bin"

# Query DreamDEX indexer for a live pool address
POOL=$(curl -s -X POST https://dev.smk.somnia.host/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ eventContracts(limit: 1, where: {status: {eq: \"trading\"}}) { pool symbol } }"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['eventContracts'][0]['pool'])" 2>/dev/null)

echo "Live pool: $POOL"

if [ -z "$POOL" ]; then
  echo "No live pool found, trying any pool..."
  POOL=$(curl -s -X POST https://dev.smk.somnia.host/v1/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ eventContracts(limit: 1) { pool symbol } }"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['eventContracts'][0]['pool'])" 2>/dev/null)
  echo "Pool: $POOL"
fi

# Query pool params to get outcomeNft address
echo "Querying pool params..."
cast call "$POOL" "getBinaryPoolParams()" --rpc-url https://api.infra.testnet.somnia.network 2>&1
