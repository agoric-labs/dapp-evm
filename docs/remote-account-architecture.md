# Remote Accounts on EVM Architecture

A **Remote Account** is a smart contract account deployed on the EVM chain. It acts on behalf of the user and is capable of:

- Holding and managing tokens
- Initiating transactions
- Receiving cross-chain instructions from Agoric through Axelar

The architecture for remote accounts on EVM involves multiple components working across three interconnected blockchain networks:

- **Agoric**
- **Axelar**
- **Ethereum**

Axelar acts as the bridge between Agoric and Ethereum.

> **Note:** While this document refers to Ethereum specifically, the architecture and concepts described here are broadly applicable to any EVM-compatible chain.

## Overview

The system comprises three main components:

---

## 1. Agoric Chain

### Axelar GMP(General Message Passing) Contract

The **Axelar GMP Contract** is deployed on the **Agoric chain** and handles message passing between a user's local Agoric account and a remote account on Ethereum. It orchestrates the remote account lifecycle and interactions.

> **Source:** [Axelar GMP Contract](../contract/src/axelar-gmp.contract.js)

It consists of two subcomponents:

#### `createAndMonitorLCA`

This is the only orchestration flow of the Axelar GMP contract.

> **Defined in**: [createAndMonitorLCA](../contract/src/evm.flows.js)

When triggered, it performs the following:

- **Creates a Local Chain Account (LCA)**
  It sets up a new LCA on the Agoric chain that will be used to interact with the remote EVM account.

- **Enables Monitoring of IBC Transfers to the LCA**
  Configures the LCA to monitor incoming IBC transfers. This is critical for detecting responses or acknowledgments sent back from EVM chains via the Axelar network.

- **Initiates Remote EVM Account Creation**
  It uses the LCA to send a message to the Ethereum chain (via Axelar) to create a corresponding remote EVM account.

- **Initiates the `EvmAccountKit`**
  Constructs an `EvmAccountKit` by passing in key runtime information:

  - The local chain account(LCA).
  - IBC channel and token denomination info.
  - Remote chain details.

  This kit manages interactions with the EVM-based chain, including sending tokens, messages and handling responses from the EVM chain.

  It also holds the `invitationMakers` that are returned to the user for initiating future actions.

#### `EVMAccountKit`

The `EvmAccountKit` is a core orchestrated object that encapsulates the state and behavior for managing communication with a remote EVM chain via the Axelar GMP protocol. It handles sending and receiving messages, tracking remote account creation, and providing invitations for user actions.

**Defined in**: [`evm-account-kit.js`](../contract/src/evm-account-kit.js)

Some key components:

- **`tap.receiveUpcall(event)`**
  Processes incoming IBC transfer events. It does the following:

  - Reads and interprets the message content
  - Checks the result of any contract calls to EVM that were performed
  - Saves the remote Ethereum account address when it becomes available

- **`holder.sendGmp(seat, offerArgs)`**  
  Responsible for performing cross-chain token transfers and invoking contract calls on the remote EVM chain via Axelar GMP.

- **`holder.getLocalAddress()`**  
  Returns the Bech32 address of the LCA.

- **`holder.getAddress()`**  
  Returns the remote EVM account address (if created).

- **`holder.getLatestMessage()`**  
  Returns the latest contract call result received from the EVM chain.

---

## 2. Ethereum Chain

Two smart contracts on Ethereum facilitate the remote account architecture:

### Factory Contract

A factory pattern contract responsible for creating new instances of Wallet contracts. It has one entry point called via Axelar’s `execute` function, which:

- Instantiates a new Wallet contract.
- Returns the address of the new Wallet instance back to Agoric (to be linked with the `EVMAccountKit`).

### Wallet Contract

This contract represents the remote Ethereum account. It is designed with:

- Logic to receive messages from Agoric, parse them, and perform arbitrary contract calls.
- A custom `Ownable` implementation ensuring only the Agoric Axelar GMP contract can invoke it.

---
