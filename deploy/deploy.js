#! /usr/bin/env node
import { execa } from 'execa';
import fs from 'fs';

const planFile = process.env.planFile;
if (!planFile) throw new Error('PLAN_FILE environment variable is required.');

const CI = process.env.CI === 'true';
const createVault = process.env.createVault === 'true';
const runInsideContainer = process.env.runInsideContainer == 'true';

const CHAINID = 'agoriclocal';
const GAS_ADJUSTMENT = '1.2';
const SIGN_BROADCAST_OPTS = `--keyring-backend=test --chain-id=${CHAINID} --gas=auto --gas-adjustment=${GAS_ADJUSTMENT} --yes -b block`;
const walletName = 'gov1';
const agops = '/usr/src/agoric-sdk/packages/agoric-cli/bin/agops';

let script = '';
let permit = '';
let bundleFiles = [];

const execCmd = async (cmd) => {
  const args = ['-c', cmd];
  const opts = { stdio: 'inherit' };
  return runInsideContainer
    ? execa('docker', ['exec', '-i', 'agoric', 'bash', ...args], opts)
    : execa('bash', args, opts);
};

const jqExtract = async (jqCmd) => {
  const { stdout } = await execa('jq', ['-r', jqCmd, planFile]);
  return stdout;
};

const setPermitAndScript = async () => {
  console.log('Set script and permit...');
  script = await jqExtract('.script');
  permit = await jqExtract('.permit');

  if (CI) {
    script = `/usr/src/upgrade-test-scripts/${script}`;
    permit = `/usr/src/upgrade-test-scripts/${permit}`;
  }

  if (!script || !permit) {
    throw new Error(`Error: Failed to parse required fields from ${planFile}`);
  }
};

const setBundleFiles = async () => {
  console.log('Setting bundle files from plan...');
  const sourceKey = CI ? '.bundles[].fileName' : '.bundles[].bundleID';
  const suffix = CI ? '' : '.json';

  const result = await jqExtract(sourceKey);
  bundleFiles = result
    .split('\n')
    .filter(Boolean)
    .map((line) => `${line}${suffix}`);
};

const copyFilesToContainer = async () => {
  if (CI) {
    console.log('Skipping file copy: running in CI environment');
    return;
  }

  const containerID = 'agoric';
  const targetDir = '/usr/src/';

  console.log('Copying script, permit, and plan...');
  await execa('docker', ['cp', script, `${containerID}:${targetDir}`]);
  await execa('docker', ['cp', permit, `${containerID}:${targetDir}`]);
  await execa('docker', ['cp', planFile, `${containerID}:${targetDir}`]);

  console.log('Copying bundle files...');
  const files = (await jqExtract('.bundles[].fileName')).split('\n');
  for (const file of files) {
    if (fs.existsSync(file)) {
      await execa('docker', ['cp', file, `${containerID}:${targetDir}`]);
    } else {
      console.warn(`Warning: File ${file} not found.`);
    }
  }
};

const installBundles = async () => {
  for (const b of bundleFiles) {
    let cmd = CI ? `cd /usr/src/upgrade-test-scripts && ` : `cd /usr/src && `;

    cmd += `echo 'Installing ${b}' && ls -sh '${b}' && agd tx swingset install-bundle --compress '@${b}' --from ${walletName} -bblock ${SIGN_BROADCAST_OPTS}`;
    console.log(`Executing installation for bundle ${b}`);
    await execCmd(cmd);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};

const openVault = async () => {
  const wantMinted = 450;
  const giveCollateral = 90;
  const walletAddress = 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q';

  if (createVault && walletAddress) {
    console.log('Creating the vault...');
    const openCmd = `${agops} vaults open --wantMinted ${wantMinted} --giveCollateral ${giveCollateral} > /tmp/want-ist.json`;
    await execCmd(openCmd);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const execOffer = `${agops} perf satisfaction --executeOffer /tmp/want-ist.json --from ${walletAddress} --keyring-backend=test`;
    console.log('Executing the offer...');
    await execCmd(execOffer);
  } else {
    console.log('Vault not created');
  }
};

const acceptProposal = async () => {
  console.log(`Submitting proposal to evaluate ${script}`);

  const baseDir = CI ? '/usr/src/upgrade-test-scripts' : '/usr/src';
  const submitCommand = `cd ${baseDir} && agd tx gov submit-proposal swingset-core-eval ${permit} ${script} --title='Install ${script}' --description='Evaluate ${script}' --deposit=10000000ubld --from ${walletName} ${SIGN_BROADCAST_OPTS} -o json`;
  await execCmd(submitCommand);

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const queryCmd = `cd ${baseDir} && agd query gov proposals --output json | jq -c '[.proposals[] | if .proposal_id == null then .id else .proposal_id end | tonumber] | max'`;

  const result = runInsideContainer
    ? await execa('docker', ['exec', '-i', 'agoric', 'bash', '-c', queryCmd])
    : await execa('bash', ['-c', queryCmd]);

  const proposalId = runInsideContainer
    ? result.stdout
    : (() => {
        const match = result.stdout.match(/\n(\d+)$/);
        const proposalId = match?.[1];
        return proposalId;
      })();

  console.log(`Voting on proposal ID ${proposalId}`);
  await execCmd(
    `agd tx gov vote ${proposalId} yes --from=validator ${SIGN_BROADCAST_OPTS}`,
  );

  console.log(`Fetching details for proposal ID ${proposalId}`);
  const detailsCommand = `agd query gov proposals --output json | jq -c '.proposals[] | select(.proposal_id == "${proposalId}" or .id == "${proposalId}") | [.proposal_id or .id, .voting_end_time, .status]'`;
  await execCmd(detailsCommand);
};

const main = async () => {
  try {
    if (!fs.existsSync('/usr/bin/jq')) {
      console.log('jq is not installed. Installing jq...');
      await execCmd('apt-get install -y jq');
    }

    await setPermitAndScript();
    await setBundleFiles();

    console.log('bundleFiles:', bundleFiles);
    console.log('script:', script);
    console.log('permit:', permit);

    await copyFilesToContainer();
    await openVault();
    await installBundles();
    await acceptProposal();
  } catch (err) {
    console.error('Error:', err.message);
  }
};

main();
