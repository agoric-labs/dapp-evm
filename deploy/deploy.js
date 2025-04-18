#! /usr/bin/env node
// @ts-check
import { readFile } from 'fs/promises';
import { execa } from 'execa';

const { log, error, warn } = console;
const planFile = process.env.planFile;

if (!planFile) {
  error('Usage: node deploy.js path/to/plan.json');
  process.exit(1);
}

const CI = process.env.CI === 'true';
const createVault = process.env.createVault === 'true';
const runInsideContainer = process.env.runInsideContainer !== 'false';

const CHAINID = 'agoriclocal';
const GAS_ADJUSTMENT = 1.2;
const walletName = 'gov1';
const agops = '/usr/src/agoric-sdk/packages/agoric-cli/bin/agops';
const SIGN_BROADCAST_OPTS = `--keyring-backend=test --chain-id=${CHAINID} --gas=auto --gas-adjustment=${GAS_ADJUSTMENT} --yes -b block`;

let script = '';
let permit = '';
let bundleFiles = [];

const execCmd = async (cmd) => {
  const fullCmd = runInsideContainer
    ? `docker exec -it agoric bash -c "${cmd}"`
    : cmd;

  try {
    const { stdout } = await execa('bash', ['-c', fullCmd]);
    return { stdout };
  } catch (err) {
    error(`Error executing: ${fullCmd}`);
    error(err.stderr || err);
    throw err;
  }
};

const ensureJqInstalled = async () => {
  try {
    await execCmd('jq --version');
  } catch {
    log('jq not found, installing...');
    await execCmd('apt-get install -y jq');
  }
};

const setPermitAndScript = async () => {
  const plan = JSON.parse(await readFile(planFile, 'utf-8'));
  script = CI ? `/usr/src/upgrade-test-scripts/${plan.script}` : plan.script;
  permit = CI ? `/usr/src/upgrade-test-scripts/${plan.permit}` : plan.permit;

  if (!script || !permit)
    throw new Error('Script or permit not defined in plan.json');
};

const setBundleFiles = async () => {
  const plan = JSON.parse(await readFile(planFile, 'utf-8'));
  const key = CI ? 'fileName' : 'bundleID';
  const suffix = CI ? '' : '.json';
  bundleFiles = plan.bundles.map((b) => `${b[key]}${suffix}`);
};

const copyFilesToContainer = async () => {
  if (CI) {
    log('Skipping copy: running in CI');
    return;
  }

  const files = [script, permit, planFile, ...bundleFiles];
  for (const file of files) {
    try {
      await execCmd(`docker cp ${file} agoric:/usr/src/`);
      log(`Copied: ${file}`);
    } catch {
      warn(`Warning: File not found or could not copy: ${file}`);
    }
  }
};

const installBundles = async () => {
  for (const b of bundleFiles) {
    const dir = CI ? '/usr/src/upgrade-test-scripts' : '/usr/src';
    const cmd = `cd ${dir} && echo 'Installing ${b}' && ls -sh '${b}' && agd tx swingset install-bundle --compress '@${b}' --from ${walletName} -bblock ${SIGN_BROADCAST_OPTS}`;
    await execCmd(cmd);
    await new Promise((r) => setTimeout(r, 5000));
  }
};

const openVault = async () => {
  if (!createVault) return;

  const wantMinted = 450;
  const giveCollateral = 90;
  const walletAddress = 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q';

  await execCmd(
    `${agops} vaults open --wantMinted ${wantMinted} --giveCollateral ${giveCollateral} > /tmp/want-ist.json`,
  );
  await new Promise((r) => setTimeout(r, 5000));
  await execCmd(
    `${agops} perf satisfaction --executeOffer /tmp/want-ist.json --from ${walletAddress} --keyring-backend=test`,
  );
};

const acceptProposal = async () => {
  const dir = CI ? '/usr/src/upgrade-test-scripts' : '/usr/src';
  const submitCmd = `cd ${dir} && agd tx gov submit-proposal swingset-core-eval ${permit} ${script} --title='Install ${script}' --description='Evaluate ${script}' --deposit=10000000ubld --from ${walletName} ${SIGN_BROADCAST_OPTS} -o json`;
  await execCmd(submitCmd);
  await new Promise((r) => setTimeout(r, 5000));

  const queryCmd = `cd ${dir} && agd query gov proposals --output json | jq -c '[.proposals[] | (if .proposal_id == null then .id else .proposal_id end | tonumber)] | max'`;
  const { stdout: latestProposalRaw } = await execCmd(queryCmd);
  const latestProposal = latestProposalRaw
    .replace(/\x1b\[[0-9;]*m/g, '')
    .trim();

  await execCmd(
    `agd tx gov vote ${latestProposal} yes --from=validator ${SIGN_BROADCAST_OPTS}`,
  );
  const detailsCmd = `agd query gov proposals --output json | jq -c '.proposals[] | select(.proposal_id == "${latestProposal}" or .id == "${latestProposal}") | [.proposal_id or .id, .voting_end_time, .status]'`;
  const { stdout: details } = await execCmd(detailsCmd);
  log('Proposal details:', details);
};

const main = async () => {
  await ensureJqInstalled();
  await setPermitAndScript();
  await setBundleFiles();

  log('bundleFiles:', bundleFiles);
  log('script:', script);
  log('permit:', permit);

  await copyFilesToContainer();
  await openVault();
  await installBundles();
  await acceptProposal();
};

main().catch((err) => {
  error('Deployment failed:', err);
  process.exit(1);
});
