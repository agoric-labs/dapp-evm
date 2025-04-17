#!/usr/bin/env node
import './lockdown.mjs';
import { execa } from 'execa';
import fs from 'fs/promises';
import { prepareOffer, fetchFromVStorage, wait } from '../utils.mjs';

const CONTAINER = 'agoric';
const OFFER_FILE = 'offer.json';
const CONTAINER_PATH = `/usr/src/${OFFER_FILE}`;
const FROM_ADDRESS = 'agoric1rwwley550k9mmk6uq6mm6z4udrg8kyuyvfszjk';
const vStorageUrl = `http://localhost/agoric-lcd/agoric/vstorage/data/published.wallet.${FROM_ADDRESS}`;
const { makeAccount, waitInSeconds } = process.env;

const writeOfferToFile = async (offer) => {
  await fs.writeFile(OFFER_FILE, JSON.stringify(offer, null, 2));
  console.log(`Written ${OFFER_FILE}`);
};

const copyOfferFileToContainer = async () => {
  await execa(`docker cp ${OFFER_FILE} ${CONTAINER}:${CONTAINER_PATH}`, {
    shell: true,
    stdio: 'inherit',
  });
  console.log(`Copied ${OFFER_FILE} to container`);
};

const executeWalletAction = async () => {
  const cmd = `agd tx swingset wallet-action "$(cat ${CONTAINER_PATH})" \
    --allow-spend \
    --from=${FROM_ADDRESS} \
    --keyring-backend=test \
    --chain-id=agoriclocal -y`;

  return execa(`docker exec ${CONTAINER} bash -c '${cmd}'`, {
    shell: true,
    stdio: 'inherit',
  });
};

const validateEvmAddress = (address) => {
  if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid EVM wallet address: ${address}`);
  }
};

try {
  if (waitInSeconds) {
    await wait(waitInSeconds);
  }

  if (makeAccount) {
    console.log('--- Creating and Monitoring LCA ---');

    const offer = await prepareOffer({
      publicInvitationMaker: 'createAndMonitorLCA',
      instanceName: 'axelarGmp',
      brandName: 'BLD',
      amount: 1n,
      source: 'contract',
    });

    await writeOfferToFile(offer);
    await copyOfferFileToContainer();
    await executeWalletAction();
  } else {
    console.log('--- Getting EVM Smart Wallet Address ---');

    const methodName = 'getAddress';
    const invitationArgs = harden([methodName, []]);

    const { offerToUsedInvitation } = await fetchFromVStorage(
      `${vStorageUrl}.current`,
    );
    const previousOffer = offerToUsedInvitation[0][0];

    const offer = await prepareOffer({
      invitationMakerName: 'makeEVMTransactionInvitation',
      instanceName: 'axelarGmp',
      emptyProposal: true,
      source: 'continuing',
      invitationArgs,
      previousOffer,
    });

    await writeOfferToFile(offer);
    await copyOfferFileToContainer();
    await executeWalletAction();
    await wait(30);

    const offerData = await fetchFromVStorage(vStorageUrl);
    console.log(`offerData: ${JSON.stringify(offerData)}`);

    const smartWalletAddress = offerData.status.result;
    validateEvmAddress(smartWalletAddress);

    console.log(`smartWalletAddress: ${smartWalletAddress}`);
  }
} catch (err) {
  console.error('ERROR:', err.shortMessage || err.message);
  process.exit(1);
}
