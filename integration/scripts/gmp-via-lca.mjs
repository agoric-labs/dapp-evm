#!/usr/bin/env node
// @ts-check
import './lockdown.mjs';
import {
  prepareOffer,
  fetchFromVStorage,
  processWalletOffer,
  validateEvmAddress,
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
  log('--- Send GMP via the LCA ---');

  log(`Fetching previous offer from ${vStorageUrl}.current`);
  const { offerToUsedInvitation } = await fetchFromVStorage(
    `${vStorageUrl}.current`,
    fetch,
  );

  const previousOffer = offerToUsedInvitation[0][0];
  log(`Previous offer found: ${JSON.stringify(previousOffer)}`);

  log('Preparing GMP send offer...');
  const factoryContractAddress = '0xef8651dD30cF990A1e831224f2E0996023163A81';
  const contractInvocationData = [
    {
      functionSignature: 'createVendor(string)',
      args: ['ownerAddress'],
      target: factoryContractAddress,
    },
  ];
  const offer = await prepareOffer({
    invitationMakerName: 'makeEVMTransactionInvitation',
    instanceName: 'axelarGmp',
    invitationArgs: harden([
      'sendGmp',
      [
        {
          destinationAddress: factoryContractAddress,
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
    offer,
    OFFER_FILE,
    CONTAINER,
    CONTAINER_PATH,
    FROM_ADDRESS,
  });

  // TODO: remove wait. Figure out how to find offer status
  log('Waiting 60 seconds for the GMP transaction to process...');
  await wait(60);

  log('--- See response from the EVM chain ---');

  log('Preparing offer to get latest message...');
  const latestMessageOffer = await prepareOffer({
    invitationMakerName: 'makeEVMTransactionInvitation',
    instanceName: 'axelarGmp',
    source: 'continuing',
    invitationArgs: harden(['getLatestMessage', []]),
    previousOffer,
    brandName: 'BLD',
    amount: 1n,
  });

  await processWalletOffer({
    offer: latestMessageOffer,
    OFFER_FILE,
    CONTAINER,
    CONTAINER_PATH,
    FROM_ADDRESS,
  });

  const pollIntervalMs = 10000; // 5 seconds
  const maxWaitMs = 2 * 60 * 1000; // 5 minutes

  const valid = await poll({
    checkFn: async () => {
      log(`Fetching offer result from ${vStorageUrl}...`);
      const offerData = await fetchFromVStorage(vStorageUrl, fetch);

      log(`Offer data received: ${JSON.stringify(offerData)}`);

      let latestMessage;
      try {
        latestMessage = JSON.parse(offerData?.status?.result);
      } catch (err) {
        log('Failed to parse offerData.status.result as JSON:', err);
      }

      if (
        Array.isArray(latestMessage) &&
        latestMessage.length > 0 &&
        latestMessage[0]?.success === true
      ) {
        const [decodedAddress] = decodeAbiParameters(
          parseAbiParameters('address'),
          latestMessage[0]?.result,
        );
        log('Decoded Address:', decodedAddress);
        validateEvmAddress(decodedAddress);
        log('Latest message is valid:', latestMessage);

        return true;
      }
      return false;
    },
    pollIntervalMs,
    maxWaitMs,
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
