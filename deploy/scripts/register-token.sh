#!/bin/bash

ASSETS_JSON=$1

if [ -z "$ASSETS_JSON" ]; then
    echo "Usage: $0 '<assets-json-array>'"
    exit 1
fi

agoric run ./asset-builder/register-interchain-bank-assets.builder.js --assets="$ASSETS_JSON" &&
    runInsideContainer=true planFile=eval-register-interchain-bank-assets-plan.json node deploy.js
