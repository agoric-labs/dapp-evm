import { CosmosToEthereumTransfer } from './transfer-client';
import dotenv from 'dotenv';

dotenv.config();

const main = async () => {
  const config = {
    agoricRpcUrl: 'https://devnet.rpc.agoric.net',
    agoricChainId: 'agoricdev-25',
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

    // Send tokens to Ethereum
    const ethereumAddress = '0x20E68F6c276AC6E297aC46c84Ab260928276691D';
    const amount = '1000000';

    const result = await transfer.sendToEthereum(ethereumAddress, amount);

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
