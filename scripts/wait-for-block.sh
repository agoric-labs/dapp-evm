#!/bin/bash

# Usage: ./wait-for-block.sh <TARGET_HEIGHT>

if [ -z "$1" ]; then
    echo "Usage: $0 <TARGET_HEIGHT>"
    exit 1
fi

TARGET_HEIGHT="$1"
SLEEP=10
RPC="http://localhost:26657"

echo "Waiting for the Agoric service to be fully ready..."
echo "Target block height: $TARGET_HEIGHT"

while true; do
    response=$(curl --silent "$RPC/abci_info")
    height=$(echo "$response" | jq -r ".result.response.last_block_height | tonumber")

    if [ "$height" -ge "$TARGET_HEIGHT" ]; then
        echo "Service is ready! Last block height: $height"
        break
    else
        echo "Waiting for last block height to reach $TARGET_HEIGHT. Current height: $height"
    fi

    sleep "$SLEEP"
done
