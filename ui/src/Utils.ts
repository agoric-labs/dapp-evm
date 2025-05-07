import { COSMOS_CHAINS } from './config';
import { AxelarQueryAPI, Environment } from '@axelar-network/axelarjs-sdk';
import { toast } from 'react-toastify';
import {
  AxelarQueryParams,
  GasEstimateParams,
  ToastMessageOptions,
} from './types';

export const isValidEthereumAddress = (address: string) => {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }
  return true;
};

export const convertToAtomicUnits = (amount: number, decimals: number) => {
  return Math.ceil(amount * Math.pow(10, decimals));
};

export const getGasEstimate = async ({
  destinationChain,
  gasLimit,
  gasMuliplier,
}: GasEstimateParams) => {
  const multiplier = gasMuliplier || 'auto';
  const api = new AxelarQueryAPI({ environment: Environment.TESTNET });
  const gasAmount = await api.estimateGasFee(
    COSMOS_CHAINS.osmosis,
    destinationChain,
    gasLimit,
    multiplier,
    'aUSDC',
  );
  const gasAmountUSDC = parseInt(gasAmount as string) / 1e6;
  console.log(`Estimated gas fee aUSDC: ${gasAmountUSDC}`);

  const usdcAtomic = convertToAtomicUnits(gasAmountUSDC, 6);
  console.log(`Estimated gas fee aUSDC: ${usdcAtomic} ATOMIC value`);

  return usdcAtomic;
};

export const showSuccess = ({
  content,
  duration,
}: ToastMessageOptions): void => {
  toast.success(content, {
    position: 'top-right',
    autoClose: duration,
  });
};

export const showError = ({
  content,
  duration = 3000,
}: ToastMessageOptions): void => {
  toast.error(content, {
    position: 'top-right',
    autoClose: duration,
  });
};

export const showWarning = ({
  content,
  duration,
}: ToastMessageOptions): void => {
  toast.warn(content, {
    position: 'top-right',
    autoClose: duration,
  });
};

export const wait = async (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

// Helpful for experimenting with different parameters:
// Visit https://docs.axelarscan.io/axelarscan
export const getAxelarTxURL = async ({
  transfersType,
  searchParams,
}: AxelarQueryParams) => {
  const isGmpQuery = transfersType === 'gmp' ? true : false;
  const url = isGmpQuery
    ? 'https://testnet.api.axelarscan.io/gmp/searchGMP'
    : 'https://testnet.api.axelarscan.io/token/searchTransfers';

  console.log(`Fetching from URL: ${url}`);
  console.log(`Query Params: ${JSON.stringify(searchParams)}`);

  const body = JSON.stringify(searchParams);
  const headers = {
    accept: '*/*',
    'content-type': 'application/json',
  };

  const startTime = Date.now();
  const pollingDurationMs = 3 * 60 * 1000; // 3 minutes
  let data: any = [];

  while (Date.now() - startTime < pollingDurationMs) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(
        `Axelar API Error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();
    data = result.data;
    console.log('Received Data:', data);

    if (Array.isArray(data) && data.length > 0) {
      break;
    }

    console.log('Data is empty, retrying...');
    await wait(10); // 10 seconds delay between retries
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      'Invalid response: Data is not an array or is empty after 3 minutes',
    );
  }

  // Sort the array by height in descending order (to get the transfer with the highest block height first)
  // We sort by height because the highest block number represents the most recent transfer.
  data.sort((a, b) =>
    isGmpQuery
      ? Number(b.call.blockNumber) - Number(a.call.blockNumber)
      : Number(b.send.height) - Number(a.send.height),
  );

  const urlSuffix = isGmpQuery ? data[0]?.call?._id : data[0]?.send?.txhash;

  if (!urlSuffix) {
    throw new Error('URL suffix is not defined');
  }

  const transactionUrl = isGmpQuery
    ? 'https://testnet.axelarscan.io/gmp/' + urlSuffix
    : 'https://testnet.axelarscan.io/transfer/' + urlSuffix;

  console.log('Transaction URL:', transactionUrl);
  return transactionUrl;
};
