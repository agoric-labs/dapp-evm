import { StargateClient } from '@cosmjs/stargate';
import { COSMOS_CHAINS, EVM_CHAINS, evmAddresses } from './config';
import { ethers } from 'ethers';
import { AxelarQueryAPI, Environment } from '@axelar-network/axelarjs-sdk';

interface BalanceCheckParams {
  walletAddress: string;
  rpcUrl: string;
  tokenDenom: string;
}

export const checkBalance = async ({
  walletAddress,
  rpcUrl,
  tokenDenom,
}: BalanceCheckParams): Promise<number> => {
  try {
    const client = await StargateClient.connect(rpcUrl);
    const balances = await client.getAllBalances(walletAddress);

    console.log(`Balance for ${walletAddress}:`);
    if (balances.length === 0) {
      console.log('Account does not exist.');
      return 0;
    }

    for (let balance of balances) {
      if (tokenDenom == balance.denom) {
        return parseFloat(balance.amount) / 1_000_000;
      }
    }

    client.disconnect();
    return 0;
  } catch (error) {
    console.error(`Failed to fetch balance: ${error.message}`);
    return 0;
  }
};

export const isValidEthereumAddress = (address) => {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }
  return true;
};

export const wait = async (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const getType1Payload = ({ chain }) => {
  const LOGIC_CALL_MSG_ID = 0;
  const targetContractAddress = evmAddresses[chain]['4'];
  const nonce = 7; // TODO: update nonce logic
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const functionSelector = ethers.utils.id('setCount(uint256)').slice(0, 10);

  const abiCoder = new ethers.utils.AbiCoder();

  const newCountValue = 234;
  const encodedArgs = abiCoder.encode(['uint256'], [newCountValue]);

  const payload = abiCoder.encode(
    ['uint256', 'address', 'uint256', 'uint256', 'bytes'],
    [
      LOGIC_CALL_MSG_ID,
      targetContractAddress,
      nonce,
      deadline,
      ethers.utils.hexlify(
        ethers.utils.concat([functionSelector, encodedArgs])
      ),
    ]
  );

  return Array.from(ethers.utils.arrayify(payload));
};

interface PayloadParams {
  type: number;
  chain: keyof typeof EVM_CHAINS;
}

export const getPayload = (params: PayloadParams) => {
  const { type, chain } = params;
  const abiCoder = new ethers.utils.AbiCoder();

  switch (type) {
    case 1:
      return getType1Payload({ chain });
    case 2:
      return Array.from(
        ethers.utils.arrayify(
          abiCoder.encode(
            ['address'],
            ['0x20E68F6c276AC6E297aC46c84Ab260928276691D']
          )
        )
      );
    case 3:
      return null;
    default:
      throw new Error('Invalid payload type');
  }
};

export const convertToAtomicUnits = (amount, decimals) => {
  return Math.ceil(amount * Math.pow(10, decimals));
};

export const getGasEstimate = async ({
  destinationChain,
  gasLimit,
  gasMuliplier,
}) => {
  const multiplier = gasMuliplier || 'auto';
  const api = new AxelarQueryAPI({ environment: Environment.TESTNET });
  const gasAmount = await api.estimateGasFee(
    COSMOS_CHAINS.osmosis,
    destinationChain,
    gasLimit,
    multiplier,
    'aUSDC'
  );
  const gasAmountUSDC = parseInt(gasAmount as string) / 1e6;
  console.log(`Estimated gas fee aUSDC: ${gasAmountUSDC}`);

  const usdcAtomic = convertToAtomicUnits(gasAmountUSDC, 6);
  console.log(`Estimated gas fee aUSDC: ${usdcAtomic} ATOMIC value`);

  return usdcAtomic;
};
