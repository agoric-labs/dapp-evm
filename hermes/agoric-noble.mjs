import { execa } from 'execa';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

dotenv.config();

const CHAIN1_ID = 'agoriclocal';
const CHAIN2_ID = 'grand-1';
const CONFIG_FILE = 'config.toml';

const agoricMnemonic = process.env.AGORIC_MNEMONIC.trim();
const nobleMnemonic = process.env.NOBLE_MNEMONIC.trim();

if (!agoricMnemonic || !nobleMnemonic) {
  throw new Error(
    'Missing environment variables: AGORIC_MNEMONIC or NOBLE_MNEMONIC',
  );
}

const deleteHermesKeysDir = async () => {
  const hermesKeysPath = path.join(os.homedir(), '.hermes', 'keys');
  try {
    await fs.rm(hermesKeysPath, { recursive: true, force: true });
    console.log('Deleted ~/.hermes/keys');
  } catch (err) {
    console.warn('Could not delete ~/.hermes/keys:', err.message);
  }
};

const runHermesCommand = async (args, options = {}) => {
  const { input } = options;
  const subprocess = execa('hermes', ['--config', CONFIG_FILE, ...args], {
    input: input ?? undefined,
    stdout: 'inherit',
    stderr: 'inherit',
  });

  await subprocess;
};

try {
  // Delete existing Hermes keys
  await deleteHermesKeysDir();

  // Add Agoric key
  await runHermesCommand(
    [
      'keys',
      'add',
      '--chain',
      CHAIN1_ID,
      '--hd-path',
      "m/44'/564'/0'/0/0",
      '--mnemonic-file',
      '/dev/stdin',
    ],
    { input: agoricMnemonic },
  );

  // Add Noble key
  await runHermesCommand(
    ['keys', 'add', '--chain', CHAIN2_ID, '--mnemonic-file', '/dev/stdin'],
    { input: nobleMnemonic },
  );

  // Create the channel
  await runHermesCommand([
    'create',
    'channel',
    '--a-chain',
    CHAIN1_ID,
    '--b-chain',
    CHAIN2_ID,
    '--a-port',
    'transfer',
    '--b-port',
    'transfer',
    '--new-client-connection',
    '--yes',
  ]);

  // Start Hermes
  await runHermesCommand(['start']);
} catch (err) {
  console.error('Error running Hermes:', err.message);
  process.exit(1);
}
