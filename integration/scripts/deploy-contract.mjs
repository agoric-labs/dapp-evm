#! /usr/bin/env node
import './lockdown.mjs';
import { execa } from 'execa';

const { script, plan, assets } = process.env;

const container = 'agoric';
const deployScript = '/usr/src/upgrade-test-scripts/deploy/deploy.js';

try {
  console.log('Step 1: Generate contract bundles...');
  const runCmd = assets
    ? `docker exec ${container} agoric run ${script} --assets='${assets}'`
    : `docker exec ${container} agoric run ${script}`;

  await execa(runCmd, { shell: true, stdio: 'inherit' });

  console.log('Step 2: Check if plan file exists in container...');
  const { stdout: lsOutput } = await execa(
    `docker exec ${container} sh -c 'ls ${plan}* || echo "Missing"'`,
    { shell: true },
  );
  if (lsOutput.includes('Missing')) {
    throw new Error(`Plan file not found at ${plan}*`);
  }

  console.log('Step 3: Deploy contract...');
  const deployCmd = `docker exec ${container} sh -c 'bash planFile=${plan} CI=true createVault=false runInsideContainer=false node ${deployScript}'`;
  await execa(deployCmd, { shell: true, stdio: 'inherit' });

  console.log('Deployment completed successfully!');
} catch (err) {
  console.error('ERROR:', err.shortMessage || err.message);
  process.exit(1);
}
