#!/usr/bin/env node
import './lockdown.mjs';
import { execa } from 'execa';
import fs from 'fs/promises';

const CONTAINER = 'agoric';
const AGORIC_REPO = 'https://github.com/Agoric/agoric-sdk.git';
const TEMP_DIR = '$HOME/temp-agoric-sdk';
const MULTICHAIN_PATH = 'multichain-testing';
const DEST_MULTICHAIN = `/usr/src/agoric-sdk/${MULTICHAIN_PATH}`;
const CONTRACT_FOLDER = process.env.CONTRACT_FOLDER || 'contract';
const DEPLOY_FOLDER = process.env.DEPLOY_FOLDER || 'deploy';
const DEPLOY_SH_LOCAL = process.env.DEPLOY_SH_LOCAL || 'deploy/deploy.sh';
const DEPLOY_SH_DEST = '/usr/src/upgrade-test-scripts/deploy.sh';

try {
  console.log('Cloning agoric-sdk...');
  await execa(`git clone ${AGORIC_REPO} ${TEMP_DIR}`, {
    shell: true,
    stdio: 'inherit',
  });

  console.log('Copying multichain-testing folder into container...');
  await execa(
    `docker cp ${TEMP_DIR}/${MULTICHAIN_PATH} ${CONTAINER}:${DEST_MULTICHAIN}`,
    {
      shell: true,
      stdio: 'inherit',
    },
  );

  console.log('Removing temporary agoric-sdk folder...');
  await fs.rm(TEMP_DIR, { recursive: true, force: true });

  console.log(
    'Installing dependencies for multichain-testing inside container...',
  );
  await execa(
    `docker exec ${CONTAINER} bash -c "cd /usr/src/agoric-sdk && yarn install"`,
    { shell: true, stdio: 'inherit' },
  );

  console.log('Copying deploy.sh into container...');
  await execa(`docker cp ${DEPLOY_SH_LOCAL} ${CONTAINER}:${DEPLOY_SH_DEST}`, {
    shell: true,
    stdio: 'inherit',
  });

  console.log('Copying Axelar GMP contract folder into container...');
  await execa(
    `docker cp ${CONTRACT_FOLDER} ${CONTAINER}:/usr/src/upgrade-test-scripts/`,
    {
      shell: true,
      stdio: 'inherit',
    },
  );

  console.log('Copying Axelar GMP deploy folder into container...');
  await execa(
    `docker cp ${DEPLOY_FOLDER} ${CONTAINER}:/usr/src/upgrade-test-scripts/`,
    {
      shell: true,
      stdio: 'inherit',
    },
  );

  console.log(
    'Installing dependencies for contract folder inside container...',
  );
  await execa(
    `docker exec ${CONTAINER} bash -c "cd /usr/src/upgrade-test-scripts/contract && yarn install"`,
    { shell: true, stdio: 'inherit' },
  );

  console.log('Installing dependencies for deploy folder inside container...');
  await execa(
    `docker exec ${CONTAINER} bash -c "cd /usr/src/upgrade-test-scripts/deploy && yarn install"`,
    { shell: true, stdio: 'inherit' },
  );

  console.log('Build the Axelar GMP contract...');
  await execa(
    `docker exec ${CONTAINER} bash -c "cd /usr/src/upgrade-test-scripts/deploy && yarn build"`,
    { shell: true, stdio: 'inherit' },
  );

  console.log('Environment setup complete.');
} catch (err) {
  console.error('ERROR:', err.shortMessage || err.message);
  process.exit(1);
}
