import crypto from 'crypto';

const hashAgoricLocal = crypto.createHash('sha256');

const newtraceLocal = {
  path: 'transfer/channel-1/transfer/channel-4118',
  base_denom: 'wavax-wei',
};

hashAgoricLocal.update(`${newtraceLocal.path}/${newtraceLocal.base_denom}`);
console.log(
  'Denom on Agoric Local:',
  hashAgoricLocal.digest('hex').toUpperCase()
);

// agoric run multichain-testing/src/register-interchain-bank-assets.builder.js --assets='[{"denom":"ibc/1B53A5A004CFB26111D79E0A4ED46518E276B92E12EA754906855A4E99364372","issuerName":"WAVAX","decimalPlaces":18}]'
// Denom: ibc/94EB1E9A676004E74ECF47F8E4BF183F4017CE0630A4D1AC7C7D9EB9CD6A3D53
