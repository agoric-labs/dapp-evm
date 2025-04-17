#!/bin/bash

if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <network> [contract]"
    echo "Network must be either 'fuji' or 'base'"
    echo "Contract options are 'counter' for deployCounter.cjs or 'proxy' for deployAxelarProxy.cjs"
    exit 1
fi

network=$1
contract=${2:-both}

deploy_contract() {
    local contract_path=$1
    local gateway_contract=$2
    local gas_service_contract=$3
    local aave_contract=$4

    GATEWAY_CONTRACT="$gateway_contract" \
        GAS_SERVICE_CONTRACT="$gas_service_contract" \
        AAVE_POOL="$aave_contract" \
        npx hardhat ignition deploy "$contract_path" --network "$network" --verify
}

delete_deployments_folder() {
    local folder=$1
    if [ -d "$folder" ]; then
        echo "Deleting existing deployment folder: $folder"
        rm -rf "$folder"
    else
        echo "No existing deployment folder to delete: $folder"
    fi
}

case $network in
fuji)
    GATEWAY='0xC249632c2D40b9001FE907806902f63038B737Ab'
    GAS_SERVICE='0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6'
    AAVE_LENDING_POOL='0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40'
    AAVE_TOKEN_GATEWAY='0x8A007E495449ffeda4C2d65f14eE31f8Bcb022CF'
    ;;
base)
    GATEWAY='0xe432150cce91c13a887f7D836923d5597adD8E31'
    GAS_SERVICE='0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6'
    ;;
*)
    echo "Invalid network specified"
    exit 1
    ;;
esac

delete_deployments_folder "ignition/deployments"

case $contract in
counter)
    deploy_contract "./ignition/modules/deployCounter.cjs" "$GATEWAY" "$GAS_SERVICE"

    ;;
proxy)
    deploy_contract "./ignition/modules/deployAxelarProxy.cjs" "$GATEWAY" "$GAS_SERVICE"

    ;;
both)
    deploy_contract "./ignition/modules/deployCounter.cjs" "$GATEWAY" "$GAS_SERVICE"
    deploy_contract "./ignition/modules/deployAxelarProxy.cjs" "$GATEWAY" "$GAS_SERVICE"

    ;;
aaveLendingPool)
    deploy_contract "./ignition/modules/deployAaveLendingPool.cjs" "$GATEWAY" "$GAS_SERVICE" "$AAVE_LENDING_POOL"

    ;;
aaveTokenGateway)
    deploy_contract "./ignition/modules/deployAaveTokenGateway.cjs" "$GATEWAY" "$GAS_SERVICE" "$AAVE_TOKEN_GATEWAY"

    ;;
*)
    echo "Invalid contract specified. Use 'counter', 'proxy', or omit for both."
    exit 1
    ;;
esac
