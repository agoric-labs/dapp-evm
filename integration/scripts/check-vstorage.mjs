#! /usr/bin/env node
// @ts-check
import './lockdown.mjs';
import { fetchFromVStorage, poll } from './utils.mjs';

const { vStorageUrl, valueToFind } = process.env;

try {
  const pollIntervalMs = 5000; // 5 seconds
  const maxWaitMs = 2 * 60 * 1000; // 2 minutes

  const found = await poll({
    checkFn: async () => {
      const data = await fetchFromVStorage(vStorageUrl);

      for (const val of data) {
        if (val[0] === valueToFind) {
          return true;
        }
      }

      return false;
    },
    pollIntervalMs,
    maxWaitMs,
  });

  if (found) {
    console.log(`✅ Test passed: ${valueToFind} was found.`);
    process.exit(0);
  } else {
    console.error(`❌ Test failed: ${valueToFind} was not found.`);
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to fetch or parse vStorage data:', error);
  process.exitCode = 1;
}
