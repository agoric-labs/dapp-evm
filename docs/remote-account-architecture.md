# Remote Accounts on EVM Architecture

The architecture for remote accounts on EVM involves multiple components working across three interconnected blockchain networks:

- **Agoric**
- **Axelar**
- **Ethereum**

Axelar acts as the bridge between Agoric and Ethereum.

## Overview

The system comprises three main components:

---

## 1. Agoric Chain

### GMP Contract

The **GMP (General Message Passing) Contract** handles message passing between a user's local Agoric account and a remote account on Ethereum. It orchestrates the remote account lifecycle and interactions, and comprises two subcomponents:

#### `createLCAAccount`

This is the only public method of the GMP contract. When triggered, it performs the following:

- Creates a new `EVMAccountKit` object that manages the remote Ethereum account.
- Sends a message to the **Factory Contract** on Ethereum to create a new remote account.
- Receives the newly created remote Ethereum account address and links it to the `EVMAccountKit` instance.

#### `EVMAccountKit`

This is the core logic object of the GMP contract, acting as the interface to the remote Ethereum account.

Key methods:

- **`receiveUpCall`**: Handles messages received from Ethereum, including:

  - The address of the remote account (upon creation).
  - Results of executed contract calls made via `sendGMP`.

- **`sendGMP`**: Sends GMP messages to the remote Ethereum account for executing arbitrary contract calls. It accepts:
  - A list of contracts,
  - The function to call,
  - Corresponding arguments.

---

## 3. Ethereum Chain

Two smart contracts on Ethereum facilitate the remote account architecture:

### Factory Contract

A factory pattern contract responsible for creating new instances of Wallet contracts. It has one entry point called via Axelar’s `execute` function, which:

- Instantiates a new Wallet contract.
- Returns the address of the new Wallet instance back to Agoric (to be linked with the `EVMAccountKit`).

### Wallet Contract

This contract represents the remote Ethereum account. It is designed with:

- Logic to receive messages from Agoric, parse them, and perform arbitrary contract calls.
- A custom `Ownable` implementation ensuring only the Agoric GMP contract can invoke it.

---
