#!/bin/bash

CHAIN1_ID=agoriclocal
CHAIN2_ID=osmo-test-5
CONFIG_FILE=config.toml

hermes --config $CONFIG_FILE keys add --chain $CHAIN1_ID --mnemonic-file ./keys/agoric.key --hd-path "m/44'/564'/0'/0/0"
hermes --config $CONFIG_FILE keys add --chain $CHAIN2_ID --mnemonic-file ./keys/osmosis.key

hermes --config $CONFIG_FILE create channel --a-chain $CHAIN1_ID --b-chain $CHAIN2_ID --a-port transfer --b-port transfer --new-client-connection --yes

hermes --config $CONFIG_FILE start
