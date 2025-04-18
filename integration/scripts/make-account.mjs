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
const { makeAccount, waitInSeconds } = process.env;
const { log, error } = console;

const validateEvmAddress = (address) => {
  if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid EVM wallet address: ${address}`);
  }
};

try {
  if (waitInSeconds) {
    log(`Waiting for ${waitInSeconds} seconds before starting...`);
    await wait(waitInSeconds);
  }

  if (makeAccount) {
    log('--- Creating and Monitoring LCA ---');

    log('Preparing offer...');
    const offer = await prepareOffer({
      publicInvitationMaker: 'createAndMonitorLCA',
      instanceName: 'axelarGmp',
      brandName: 'BLD',
      amount: 1n,
      source: 'contract',
    });

    log('Writing offer to file...');
    await writeOfferToFile({ offer, OFFER_FILE });

    log('Copying offer file to container...');
    await copyOfferFileToContainer({
      OFFER_FILE,
      CONTAINER,
      CONTAINER_PATH,
    });

    log('Executing wallet action...');
    await executeWalletAction({
      CONTAINER,
      CONTAINER_PATH,
      FROM_ADDRESS,
    });

    log('--- LCA creation process complete ---');
  } else {
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

    log('Writing offer to file...');
    await writeOfferToFile({ offer, OFFER_FILE });

    log('Copying offer file to container...');
    await copyOfferFileToContainer({ OFFER_FILE, CONTAINER, CONTAINER_PATH });

    log('Executing wallet action...');
    await executeWalletAction({ CONTAINER, CONTAINER_PATH, FROM_ADDRESS });

    log('Waiting 30 seconds for offer result...');
    await wait(30);

    log(`Fetching offer result from ${vStorageUrl}`);
    const offerData = await fetchFromVStorage(vStorageUrl);
    log(`Offer data received: ${JSON.stringify(offerData)}`);

    const smartWalletAddress = offerData.status.result;
    log(`Validating smart wallet address: ${smartWalletAddress}`);
    validateEvmAddress(smartWalletAddress);

    log(`Smart wallet address: ${smartWalletAddress}`);
  }
} catch (err) {
  error('ERROR:', err.shortMessage || err.message);
  process.exit(1);
}
