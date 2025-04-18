#!/usr/bin/env node
import './lockdown.mjs';
import {
  prepareOffer,
  fetchFromVStorage,
  wait,
  copyOfferFileToContainer,
  writeOfferToFile,
  executeWalletAction,
} from './utils.mjs';

const CONTAINER = 'agoric';
const OFFER_FILE = 'offer.json';
const CONTAINER_PATH = `/usr/src/${OFFER_FILE}`;
const FROM_ADDRESS = 'agoric1rwwley550k9mmk6uq6mm6z4udrg8kyuyvfszjk';
const vStorageUrl = `http://localhost/agoric-lcd/agoric/vstorage/data/published.wallet.${FROM_ADDRESS}`;
const { waitInSeconds } = process.env;
const { log, error } = console;

try {
  if (waitInSeconds) {
    log(`Waiting for ${waitInSeconds} seconds before proceeding...`);
    await wait(waitInSeconds);
  }

  log('--- Send GMP via the LCA ---');

  log(`Fetching previous offer from ${vStorageUrl}.current`);
  const { offerToUsedInvitation } = await fetchFromVStorage(
    `${vStorageUrl}.current`,
  );

  const previousOffer = offerToUsedInvitation[0][0];
  log(`Previous offer found: ${JSON.stringify(previousOffer)}`);

  log('Preparing GMP send offer...');
  const offer = await prepareOffer({
    invitationMakerName: 'makeEVMTransactionInvitation',
    instanceName: 'axelarGmp',
    invitationArgs: harden([
      'sendGmp',
      [
        {
          destinationAddress: '0x5B34876FFB1656710fb963ecD199C6f173c29267',
          type: 1,
          gasAmount: 20000,
          destinationEVMChain: 'Ethereum',
          contractInvocationData: {
            functionSelector: 'createVendor(string)',
            argType: 'string',
            argValue: 'ownerAddress',
          },
        },
      ],
    ]),
    source: 'continuing',
    previousOffer,
    brandName: 'BLD',
    amount: 1000000n,
  });

  log('Writing offer to file...');
  await writeOfferToFile({ offer, OFFER_FILE });

  log('Copying offer file to container...');
  await copyOfferFileToContainer({ OFFER_FILE, CONTAINER, CONTAINER_PATH });

  log('Executing wallet action...');
  await executeWalletAction({ CONTAINER, CONTAINER_PATH, FROM_ADDRESS });

  log('Waiting 70 seconds for the GMP transaction to process...');
  await wait(70);

  log('--- See response from the EVM chain ---');

  log('Preparing offer to get latest message...');
  const offerII = await prepareOffer({
    invitationMakerName: 'makeEVMTransactionInvitation',
    instanceName: 'axelarGmp',
    source: 'continuing',
    invitationArgs: harden(['getLatestMessage', []]),
    previousOffer,
    brandName: 'BLD',
    amount: 1n,
  });

  log('Writing "getLatestMessage" offer to file...');
  await writeOfferToFile({ offer: offerII, OFFER_FILE });

  log('Copying offer file to container...');
  await copyOfferFileToContainer({ OFFER_FILE, CONTAINER, CONTAINER_PATH });

  log('Executing wallet action...');
  await executeWalletAction({ CONTAINER, CONTAINER_PATH, FROM_ADDRESS });

  log('Waiting 30 seconds for message retrieval...');
  await wait(30);

  log(`Fetching offer result from ${vStorageUrl}...`);
  const offerData = await fetchFromVStorage(vStorageUrl);
  log(`Offer data received: ${JSON.stringify(offerData)}`);

  const latestMessage = offerData.status.result;
  if (latestMessage && latestMessage !== '#undefined') {
    log('Latest message is valid:', latestMessage);
  } else {
    throw new Error(`Latest message is invalid: ${latestMessage}`);
  }
} catch (err) {
  error('ERROR:', err.shortMessage || err.message);
  process.exit(1);
}
