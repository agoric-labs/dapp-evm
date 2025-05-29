import { CosmosToEthereumTransfer } from './transfer-client';
import dotenv from 'dotenv';

dotenv.config();

const main = async () => {
  const config = {
    rpcUrl: 'https://devnet.rpc.agoric.net',
    chainId: 'agoricdev-25',
    sourceClientId: '07-tendermint-18',
    denom: 'ubld',
    transferPort: 'transfer',
    agoricPrefix: 'agoric',
  };

  const transfer = new CosmosToEthereumTransfer(config);

  try {
    const mnemonic = process.env.MNEMONIC;

    if (!mnemonic) {
      throw new Error('MNEMONIC environment variable is not set');
    }

    await transfer.initialize(mnemonic);

    const balance = await transfer.getBalance(config.denom);
    console.log(`Balance: ${balance.amount} ${balance.denom}`);

    const result = await transfer.sendToEthereum({
      recipientEthAddress: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
      recipientCosmosHub: 'cosmos1n4j0cy98dac5q6d9y5nhlmk5d6e4wzve8thmmq',
      amount: 1000000,
      sourceChannel: 'channel-25',
      timeoutTimestamp: (Math.floor(Date.now() / 1000) + 600) * 1e9,
    });

    if (result.success) {
      console.log('Transfer initiated successfully!');
      console.log(
        'Note: The transfer will be completed when a relayer picks up and processes the packet.',
      );
    } else {
      console.log('Transfer failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

main().catch(console.error);
