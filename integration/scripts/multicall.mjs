#!/usr/bin/env node
// @ts-check
import './lockdown.mjs';
import {
  prepareOffer,
  fetchFromVStorage,
  wait,
  validateEvmAddress,
  processWalletOffer,
} from './utils.mjs';
import { decodeAbiParameters, parseAbiParameters } from 'viem';

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

  log('Waiting 30 seconds for offer result...');
  await wait(30);

  log(`Fetching offer result from ${vStorageUrl}`);
  const offerData = await fetchFromVStorage(vStorageUrl);
  log(`Offer data received: ${JSON.stringify(offerData)}`);

  const smartWalletAddress = offerData.status.result;
  log(`Validating smart wallet address: ${smartWalletAddress}`);
  validateEvmAddress(smartWalletAddress);

  log(`Smart wallet address: ${smartWalletAddress}`);

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

  log('Waiting 80 seconds for the GMP transaction to process...');
  await wait(80);

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

  log('Waiting 30 seconds for offer result...');
  await wait(30);

  log(`Fetching offer result from ${vStorageUrl}`);
  const latestMessagOfferData = await fetchFromVStorage(vStorageUrl);
  log(`Offer data received: ${JSON.stringify(latestMessagOfferData)}`);
  const latestMessage = JSON.parse(latestMessagOfferData.status.result);

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
  } else {
    throw new Error(`Latest message is invalid: ${latestMessage}`);
  }
} catch (err) {
  error('ERROR:', err.shortMessage || err.message);
  process.exit(1);
}
