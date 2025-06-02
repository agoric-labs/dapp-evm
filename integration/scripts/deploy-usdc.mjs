#! /usr/bin/env node
// @ts-check
import './lockdown.mjs';
import { execa } from 'execa';
import { initMultichainTestingInContainer } from './utils.mjs';

const CONTAINER = 'agoric';
const AGORIC_REPO = 'https://github.com/Agoric/agoric-sdk.git';
const TEMP_DIR = '$HOME/temp-agoric-sdk';
const MULTICHAIN_PATH = 'multichain-testing';
const DEST_MULTICHAIN = `/usr/src/agoric-sdk/${MULTICHAIN_PATH}`;
const DEPLOYJS_FILE = '../deploy/deploy.js';

const deployScript = '/usr/src/upgrade-test-scripts/deploy.mjs';
const assets =
  '[{"denom":"ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5","issuerName":"noble_USDC","decimalPlaces":6}]';
const plan =
  '/usr/src/upgrade-test-scripts/eval-register-interchain-bank-assets-plan.json';
const script =
  '/usr/src/agoric-sdk/multichain-testing/src/register-interchain-bank-assets.builder.js';

try {
  await initMultichainTestingInContainer({
    AGORIC_REPO,
    TEMP_DIR,
    MULTICHAIN_PATH,
    CONTAINER,
    DEST_MULTICHAIN,
    DEPLOY_FOLDER: DEPLOYJS_FILE,
  });

  console.log('Step 1: Generate contract bundles...');
  const runCmd = `docker exec ${CONTAINER} agoric run ${script} --assets='${assets}'`;

  await execa(runCmd, { shell: true, stdio: 'inherit' });

  console.log('Step 2: Check if plan file exists in container...');
  const { stdout: lsOutput } = await execa(
    `docker exec ${CONTAINER} sh -c 'ls ${plan}* || echo "Missing"'`,
    { shell: true },
  );
  if (lsOutput.includes('Missing')) {
    throw new Error(`Plan file not found at ${plan}*`);
  }

  console.log('Step 3: Copying deploy.js into container as deploy.mjs...');
  await execa(
    `docker cp ${DEPLOYJS_FILE} ${CONTAINER}:/usr/src/upgrade-test-scripts/deploy.mjs`,
    {
      shell: true,
      stdio: 'inherit',
    },
  );

  console.log('Step 4: Install execa...');
  await execa(
    `docker exec ${CONTAINER} bash -c "cd /usr/src/upgrade-test-scripts && yarn add execa"`,
    { shell: true, stdio: 'inherit' },
  );

  console.log('Step 5: Deploy contract...');
  const deployCmd = `docker exec ${CONTAINER} sh -c "planFile=${plan} CI=true runInsideContainer=false node ${deployScript}"`;
  await execa(deployCmd, { shell: true, stdio: 'inherit' });
} catch (err) {
  console.error('ERROR:', err);
  process.exit(1);
}
