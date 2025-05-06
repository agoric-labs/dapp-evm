#!/usr/bin/env node
// @ts-check
import './lockdown.mjs';
import {
  prepareOffer,
  fetchFromVStorage,
  validateEvmAddress,
  processWalletOffer,
  poll,
  wait,
} from './utils.mjs';
import { decodeAbiParameters, parseAbiParameters } from 'viem';

const CONTAINER = 'agoric';
const OFFER_FILE = 'offer.json';
const CONTAINER_PATH = `/usr/src/${OFFER_FILE}`;
const FROM_ADDRESS = 'agoric1rwwley550k9mmk6uq6mm6z4udrg8kyuyvfszjk';
const vStorageUrl = `http://localhost/agoric-lcd/agoric/vstorage/data/published.wallet.${FROM_ADDRESS}`;
const { log, error } = console;

try {
  log('--- Getting EVM Smart Wallet Address ---');

  const methodName = 'getAddress';
  const invitationArgs = harden([methodName, []]);

  log(`Fetching previous offer from ${vStorageUrl}.current`);
  const { offerToUsedInvitation } = await fetchFromVStorage(
    `${vStorageUrl}.current`,
  );
  const previousOffer = offerToUsedInvitation[0][0];
  log(`Previous offer found: ${JSON.stringify(previousOffer)}`);

  log('Preparing offer...');
  const offer = await prepareOffer({
    invitationMakerName: 'makeEVMTransactionInvitation',
    instanceName: 'axelarGmp',
    emptyProposal: true,
    source: 'continuing',
    invitationArgs,
    previousOffer,
  });

  await processWalletOffer({
    offer,
    OFFER_FILE,
    CONTAINER,
    CONTAINER_PATH,
    FROM_ADDRESS,
  });

  const pollIntervalMs = 5000; // 5 seconds
  const maxWaitMs = 2 * 60 * 1000; // 2 minutes
  let smartWalletAddress;
  await poll({
    checkFn: async () => {
      log(`Fetching offer result from ${vStorageUrl}`);
      const offerData = await fetchFromVStorage(vStorageUrl);
      log(`Offer data received: ${JSON.stringify(offerData)}`);

      try {
        smartWalletAddress = offerData?.status?.result;
      } catch (err) {
        log('Failed to parse offerData.status.result as JSON:', err);
      }

      log(`Validating smart wallet address: ${smartWalletAddress}`);
      validateEvmAddress(smartWalletAddress);

      log(`Smart wallet address: ${smartWalletAddress}`);
      return true;
    },
    pollIntervalMs,
    maxWaitMs,
  });

  if (!smartWalletAddress) {
    throw Error('smartWalletAddress is not defined');
  }

  log('--- Preparing MultiCall Offer ---');
  const multiCallContractAddress = '0x5B34876FFB1656710fb963ecD199C6f173c29267';
  const contractInvocationData = [
    {
      functionSignature: 'setValue(uint256)',
      args: [42],
      target: multiCallContractAddress,
    },
    {
      functionSignature: 'addToValue(uint256)',
      args: [10],
      target: multiCallContractAddress,
    },
    {
      functionSignature: 'getValue()',
      args: [],
      target: multiCallContractAddress,
    },
  ];

  const multiCallOffer = await prepareOffer({
    invitationMakerName: 'makeEVMTransactionInvitation',
    instanceName: 'axelarGmp',
    invitationArgs: harden([
      'sendGmp',
      [
        {
          destinationAddress: smartWalletAddress,
          type: 1,
          gasAmount: 20000,
          destinationEVMChain: 'Ethereum',
          contractInvocationData,
        },
      ],
    ]),
    source: 'continuing',
    previousOffer,
    brandName: 'BLD',
    amount: 1000000n,
  });

  await processWalletOffer({
    offer: multiCallOffer,
    OFFER_FILE,
    CONTAINER,
    CONTAINER_PATH,
    FROM_ADDRESS,
  });

  // TODO: remove wait. Figure out how to find offer status
  log('Waiting 60 seconds for the GMP transaction to process...');
  await wait(60);

  log('--- Verify Response from EVM ---');

  const latestMessageOffer = await prepareOffer({
    invitationMakerName: 'makeEVMTransactionInvitation',
    instanceName: 'axelarGmp',
    emptyProposal: true,
    source: 'continuing',
    invitationArgs: harden(['getLatestMessage', []]),
    previousOffer,
  });

  await processWalletOffer({
    offer: latestMessageOffer,
    OFFER_FILE,
    CONTAINER,
    CONTAINER_PATH,
    FROM_ADDRESS,
  });

  const valid = await poll({
    checkFn: async () => {
      log(`Fetching offer result from ${vStorageUrl}`);
      const latestMessagOfferData = await fetchFromVStorage(vStorageUrl);
      log(`Offer data received: ${JSON.stringify(latestMessagOfferData)}`);

      let latestMessage;
      try {
        latestMessage = JSON.parse(latestMessagOfferData?.status?.result);
      } catch (err) {
        log('Failed to parse offerData.status.result as JSON:', err);
      }

      if (
        Array.isArray(latestMessage) &&
        latestMessage.length > 0 &&
        latestMessage[2]?.success === true &&
        decodeAbiParameters(
          parseAbiParameters('uint256'),
          latestMessage[2].result,
        )[0] === 52n
      ) {
        log('Latest message is valid:', latestMessage);
        return true;
      }
      return false;
    },
    pollIntervalMs: 10000, // 10 sec,
    maxWaitMs: 3 * 60 * 1000, // 3 min
  });

  if (valid) {
    console.log(`✅ Test passed`);
  } else {
    console.error(`❌ Test failed`);
    process.exitCode = 1;
  }
} catch (err) {
  error('ERROR:', err.shortMessage || err.message);
  process.exit(1);
}
