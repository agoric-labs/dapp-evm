#!/usr/bin/env node
import './lockdown.mjs';
import { execa } from 'execa';
import fs from 'fs/promises';
import { prepareOffer } from './prepare-offer.mjs';

const CONTAINER = 'agoric';
const OFFER_FILE = 'offer.json';
const CONTAINER_PATH = `/usr/src/${OFFER_FILE}`;
const FROM_ADDRESS = 'agoric1rwwley550k9mmk6uq6mm6z4udrg8kyuyvfszjk';

const writeOffer = async (offer) => {
  await fs.writeFile(OFFER_FILE, JSON.stringify(offer, null, 2));
  console.log(`Written ${OFFER_FILE}`);
};

const copyOfferToContainer = async () => {
  await execa(`docker cp ${OFFER_FILE} ${CONTAINER}:${CONTAINER_PATH}`, {
    shell: true,
    stdio: 'inherit',
  });
  console.log(`Copied ${OFFER_FILE} to container`);
};

const runWalletAction = async () => {
  const cmd = `agd tx swingset wallet-action "$(cat ${CONTAINER_PATH})" \
    --allow-spend \
    --from=${FROM_ADDRESS} \
    --keyring-backend=test \
    --chain-id=agoriclocal -y`;

  const result = await execa(`docker exec ${CONTAINER} bash -c '${cmd}'`, {
    shell: true,
    stdio: 'inherit',
  });
  return result;
};

try {
  console.log('--- Step 1: createAndMonitorLCA ---');

  const { id, offer } = await prepareOffer({
    invitationMakerName: 'createAndMonitorLCA',
    instanceName: 'axelarGmp',
    brandName: 'BLD',
    amount: 1n,
    source: 'contract',
  });

  await writeOffer(offer);
  await copyOfferToContainer();
  await runWalletAction();

  console.log('--- Step 2: getEVMSmartWalletAddress ---');

  const methodName = 'getEVMSmartWalletAddress';
  const invitationArgs = harden([methodName, []]);

  const { offer: offerII } = await prepareOffer({
    invitationMakerName: 'makeEVMTransactionInvitation',
    instanceName: 'axelarGmp',
    emptyProposal: true,
    source: 'continuing',
    invitationArgs,
    previousOffer: id,
  });

  await writeOffer(offerII);
  await copyOfferToContainer();
  const res = await runWalletAction();

  console.log('EVM Wallet Address Response:', res.stdout || res);
} catch (err) {
  console.error('ERROR:', err.shortMessage || err.message);
  process.exit(1);
}
