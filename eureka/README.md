# Getting CosmosHub Testnet Channels with Agoric

```bash
rly q channels agoric-devnet --limit=5000 | grep "provider"
```

## Channel being used

```bash
source-client: 07-tendermint-18
source-channel: channel-25

destination-client: 07-tendermint-311
destination-channel: channel-388
```

# IBC Eureka

**Purpose:**  
Simplify communication between Cosmos and Ethereum ecosystems.

**Foundation:**  
Built on IBC v2, Skip Go, and Cosmos Hub.

Cosmos Hub acts as the gateway to Ethereum, ensuring compatibility with the IBC classic infrastructure.

> **Note:**  
> Currently, only Ethereum is supported. Integration with additional chains is planned for the future.

## Componenets

- IBC v2: remove shortcomings of IBC classic.
- Skip Go: Interface to interact with IBC Eureka.
- Cosmos Hub

## Light Clients in IBC Eureka

When Cosmos and Ethereum talk to each other using IBC v2, they need to trust each other’s chains.

## On the Cosmos Side

- An Ethereum light client is deployed as a CosmWasm smart contract on the Cosmos Hub.
- It uses a special IBC client type called `08-wasm` (lets you write light clients as smart contracts).
- This smart contract understands Ethereum and verifies Ethereum block headers and transactions.

## On the Ethereum Side

- Ethereum doesn't natively support Cosmos.
- So they use something called SP1 zkVM (from Succinct) to run a Cosmos Hub light client on Ethereum.

# Read More

- [IBC Eureka Technical Walkthrough](https://blog.cosmos.network/ibc-eureka-technical-walkthrough-0ba77c715baa)
- [Custom Eureka ERC20 Integration](https://skip-protocol.notion.site/EXT-Custom-Eureka-ERC20-Integration-1fc8c17818cb80569723dd1ff8fb9ffd)
