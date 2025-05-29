# Role of CosmosHub in IBC Eureka

The Cosmos Hub is a blockchain — the very first chain built in the Cosmos ecosystem.

## 1. Main Entry Point to Ethereum

- Cosmos Hub acts like the **main door** to enter or leave Cosmos when talking to **Ethereum**.
- Instead of every chain building its own bridge to Ethereum, they can just use the Cosmos Hub’s bridge.

## 2. One Connection, Many Destinations

Let’s say your chain (e.g. Babylon or Seda) wants to send tokens to Ethereum.

**Without Cosmos Hub:**

- You’d need your **own bridge**, your **own relayers**, and maintain it all.

**With Cosmos Hub:**

- You only connect to the Hub.
- The Hub already knows how to talk to Ethereum using **IBC Eureka**.
- The Hub **forwards the tokens for you**.

## 3. Still Optional

You can use IBC Eureka **without** going through Cosmos Hub — but:

- **Using the Hub makes it easier.**
- Some features (like accessing rollups like Arbitrum) **might only be possible** through the Hub later.
