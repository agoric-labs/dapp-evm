#! /usr/bin/env node

const { vStorageUrl, valueToFind, waitInSeconds } = process.env;

try {
  if (waitInSeconds) {
    await new Promise((resolve) => setTimeout(resolve, waitInSeconds * 1000));
  }

  const response = await fetch(vStorageUrl);
  const { value } = await response.json();

  const rawValue = JSON.parse(value)?.values?.[0];
  if (!rawValue) {
    throw new Error('Missing expected data in vStorage response');
  }

  const bodyString = JSON.parse(rawValue).body;
  const parsedData = JSON.parse(bodyString.slice(1));

  let found = false;

  for (const val of parsedData) {
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
