# Steps to run

## 1. Install dependencies and build the monorepo

```bash
yarn # install dependencies
yarn build # build items in subdirectories
```

## 2. Start the environment

```bash
yarn local-env:start # start agoric and axelar chains
yarn deploy-contracts # deploy contracts on agoric
```

## 3. Start the UI

```bash
yarn start:ui
```

## 4. Start the relayer

This will boot up a local Ethereum chain and start relaying between Agoric <=> EVM using Axelar

```bash
yarn local-env:relay
```
