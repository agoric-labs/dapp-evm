#! /usr/bin/env node
import './lockdown.mjs';
import { fetchFromVStorage, wait } from './utils.mjs';

const { vStorageUrl, valueToFind, waitInSeconds } = process.env;

try {
  if (waitInSeconds) {
    await wait(waitInSeconds);
  }

  const data = await fetchFromVStorage(vStorageUrl);

  let found = false;

  for (const val of data) {
    if (val[0] === valueToFind) {
      found = true;
      break;
    }
  }

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
