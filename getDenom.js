import crypto from 'crypto';

const hashAgoricLocal = crypto.createHash('sha256');

const newtraceLocal = {
  path: 'transfer/channel-0',
  base_denom: 'uaxl',
};

hashAgoricLocal.update(`${newtraceLocal.path}/${newtraceLocal.base_denom}`);
console.log(
  'Denom on Agoric Local:',
  hashAgoricLocal.digest('hex').toUpperCase()
);

// agoric run multichain-testing/src/register-interchain-bank-assets.builder.js --assets='[{"denom":"ibc/3C870A71004EAD01A29709B779FECBB9F150559B1276825584E149596BD450DE","issuerName":"WAVAX","decimalPlaces":6}]'
// Denom: ibc/3C870A71004EAD01A29709B779FECBB9F150559B1276825584E149596BD450DE
