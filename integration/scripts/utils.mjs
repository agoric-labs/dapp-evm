// @ts-check
import { makeVstorageKit, makeAgoricNames } from '@agoric/client-utils';
import fs from 'fs/promises';
import { execa } from 'execa';

const LOCAL_CONFIG = {
  rpcAddrs: ['http://localhost/agoric-rpc'],
  chainName: 'agoriclocal',
};

const vstorageKit = makeVstorageKit({ fetch }, LOCAL_CONFIG);

/**
 * @typedef {Object} PrepareOfferParams
 * @property {string} instanceName - The instance name to get from AgoricNames.
 * @property {string} source - Source of the invitation: 'contract' | 'continuing'.
 * @property {string} [publicInvitationMaker] - Used for public invitations.
 * @property {string} [invitationMakerName] - Used for contract invitations.
 * @property {string} [brandName] - Required if giving an amount.
 * @property {bigint} [amount] - Required if giving something.
 * @property {any[]} [invitationArgs] - Arguments for the invitation (e.g. method, params).
 * @property {string} [previousOffer] - For continuing invitations.
 * @property {boolean} [emptyProposal] - If true, skips constructing the give section.
 * @property {(x: any) => any} [hardenFn] - Optionally override the harden function.
 */

/**
 * Prepares a hardened offer object with all required CapData format.
 * @param {PrepareOfferParams} params
 * @returns {Promise<any>} CapData object ready to be written or sent to wallet.
 */
export const prepareOffer = async ({
  instanceName,
  source,
  publicInvitationMaker,
  invitationMakerName,
  brandName,
  amount,
  invitationArgs,
  previousOffer,
  emptyProposal = false,
}) => {
  if (!vstorageKit) throw new Error('vstorageKit is required');
  if (!instanceName) throw new Error('instanceName is required');
  if (!source) throw new Error('source is required');

  const { brand, instance } = await makeAgoricNames(
    vstorageKit.fromBoard,
    vstorageKit.vstorage,
  );

  const offerId = `offer-${Date.now()}`;

  const invitationSpec = {
    ...(invitationMakerName && { invitationMakerName }),
    ...(publicInvitationMaker && { publicInvitationMaker }),
    source,
    instance: instance[instanceName],
    ...(invitationArgs && { invitationArgs }),
    ...(previousOffer && { previousOffer }),
  };

  const proposal =
    emptyProposal || !amount || !brandName
      ? {}
      : {
          give: {
            [brandName]: {
              brand: brand[brandName],
              value: amount,
            },
          },
        };

  const body = {
    method: 'executeOffer',
    offer: {
      id: offerId,
      invitationSpec,
      proposal,
    },
  };

  // @ts-ignore
  return vstorageKit.marshaller.toCapData(harden(body));
};

export const wait = async (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const fetchFromVStorage = async (vStorageUrl) => {
  const response = await fetch(vStorageUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText}`,
    );
  }

  const { value } = await response.json();

  const rawValue = JSON.parse(value)?.values?.[0];
  if (!rawValue) {
    throw new Error('Missing expected data in vStorage response');
  }

  const bodyString = JSON.parse(rawValue).body;
  return JSON.parse(bodyString.slice(1));
};

export const writeOfferToFile = async ({ OFFER_FILE, offer }) => {
  await fs.writeFile(OFFER_FILE, JSON.stringify(offer, null, 2));
  console.log(`Written ${OFFER_FILE}`);
};

export const copyOfferFileToContainer = async ({
  OFFER_FILE,
  CONTAINER,
  CONTAINER_PATH,
}) => {
  await execa(`docker cp ${OFFER_FILE} ${CONTAINER}:${CONTAINER_PATH}`, {
    shell: true,
    stdio: 'inherit',
  });
  console.log(`Copied ${OFFER_FILE} to container`);
};

export const executeWalletAction = async ({
  CONTAINER,
  CONTAINER_PATH,
  FROM_ADDRESS,
}) => {
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

export const validateEvmAddress = (address) => {
  if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid EVM wallet address: ${address}`);
  }
};

export const processWalletOffer = async ({
  offer,
  OFFER_FILE,
  CONTAINER,
  CONTAINER_PATH,
  FROM_ADDRESS,
}) => {
  console.log('Writing offer to file...');
  await writeOfferToFile({ offer, OFFER_FILE });

  console.log('Copying offer file to container...');
  await copyOfferFileToContainer({ OFFER_FILE, CONTAINER, CONTAINER_PATH });

  console.log('Executing wallet action...');
  await executeWalletAction({ CONTAINER, CONTAINER_PATH, FROM_ADDRESS });
};

/**
 * A generic polling function.
 *
 * @typedef {Object} pollingParams
 * @property {() => Promise<boolean>} checkFn - The async function that returns true when the condition is met.
 * @property {number} pollIntervalMs - Polling interval in milliseconds.
 * @property {number} maxWaitMs - Max wait time in milliseconds.
 * @returns {Promise<boolean>} - Resolves true if condition met, false if timeout.
 */
export const poll = async ({ checkFn, pollIntervalMs, maxWaitMs }) => {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    try {
      const result = await checkFn();
      if (result) return true;
    } catch (err) {
      console.error('Polling error:', err);
    }

    console.log(`Waiting ${pollIntervalMs / 1000} seconds...`);
    await new Promise((res) => setTimeout(res, pollIntervalMs));
  }

  return false;
};

/**
 * Sets up the multichain-testing environment by cloning the Agoric SDK,
 * copying the multichain-testing directory into a Docker container,
 * installing dependencies, and cleaning up.
 *
 * @param {object} options - Configuration options.
 * @param {string} options.AGORIC_REPO - Git repository URL of agoric-sdk.
 * @param {string} options.TEMP_DIR - Temporary directory path to clone the repository.
 * @param {string} options.MULTICHAIN_PATH - Path to the multichain-testing folder within the cloned repo.
 * @param {string} options.CONTAINER - Docker container name or ID to copy files into and run commands inside.
 * @param {string} options.DEST_MULTICHAIN - Destination path in the Docker container.
 * @param {string} options.DEPLOY_FOLDER - Destination path of deploy folder in this repository.
 */
export const initMultichainTestingInContainer = async ({
  AGORIC_REPO,
  TEMP_DIR,
  MULTICHAIN_PATH,
  CONTAINER,
  DEST_MULTICHAIN,
  DEPLOY_FOLDER,
}) => {
  console.log('Cloning agoric-sdk...');
  await execa(`git clone ${AGORIC_REPO} ${TEMP_DIR} --depth=1`, {
    shell: true,
    stdio: 'inherit',
  });

  console.log('Copying multichain-testing folder into container...');
  await execa(
    `docker cp ${TEMP_DIR}/${MULTICHAIN_PATH} ${CONTAINER}:${DEST_MULTICHAIN}`,
    { shell: true, stdio: 'inherit' },
  );

  console.log('Removing temporary agoric-sdk folder...');
  await execa(`rm -rf ${TEMP_DIR}`, { shell: true, stdio: 'inherit' });

  console.log('Checking if node_modules already exists...');
  const checkCmd = `docker exec ${CONTAINER} bash -c 'test -d /usr/src/agoric-sdk/node_modules'`;
  try {
    await execa(checkCmd, { shell: true });
    console.log('Dependencies already installed. Skipping yarn install.');
  } catch {
    console.log('node_modules not found. Installing dependencies...');
    await execa(
      `docker exec ${CONTAINER} bash -c "cd /usr/src/agoric-sdk && yarn install"`,
      { shell: true, stdio: 'inherit' },
    );
  }
};
