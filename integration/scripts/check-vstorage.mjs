#! /usr/bin/env node
import './lockdown.mjs';
import { fetchFromVStorage, poll } from './utils.mjs';

const { vStorageUrl, valueToFind } = process.env;

try {
  const pollIntervalMs = 5000; // 5 seconds
  const maxWaitMs = 2 * 60 * 1000; // 2 minutes

  const found = await poll(
    async () => {
      const data = await fetchFromVStorage(vStorageUrl);
      return data.some(([val]) => val === valueToFind);
    },
    pollIntervalMs,
    maxWaitMs,
  );

  if (found) {
    console.log(`✅ Test passed: ${valueToFind} was found.`);
  } else {
    console.error(`❌ Test failed: ${valueToFind} was not found.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Failed to fetch or parse vStorage data:', error);
  process.exitCode = 1;
}
