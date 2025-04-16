/**
 * @file utils/gmp.js GMP payload construction utilities
 */
import { encode } from '@findeth/abi';
import sha3 from 'js-sha3';

export const GMPMessageType = {
  MESSAGE_ONLY: 1,
  MESSAGE_WITH_TOKEN: 2,
  TOKEN_ONLY: 3,
};

export const gmpAddresses = {
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  OSMOSIS_RECEIVER: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
};

export const uint8ArrayToHex = (uint8Array) => {
  return `0x${Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`;
};

export const encodeCallData = (functionSignature, paramTypes, params) => {
  const functionHash = sha3.keccak256.digest(functionSignature);

  return uint8ArrayToHex(
    Uint8Array.from([
      ...Uint8Array.from(functionHash.slice(0, 4)),
      ...encode(paramTypes, params),
    ]),
  );
};

/**
 * Builds a GMP payload for contract invocation
 *
 * @param {object} params Contract invocation parameters
 * @param {number} params.type GMP message type
 * @param {array} params.targets Target contract address
 * @param {string} params.functionSelector
 * @param {string} params.argType
 * @param {string} params.argValue
 * @returns {number[] | null} Encoded payload as number array, or null for a
 *   pure token transfer
 */
export const buildGMPPayload = ({
  type,
  targets,
  functionSelector,
  argType,
  argValue,
}) => {
  if (type === GMPMessageType.TOKEN_ONLY) {
    return null;
  }

  const data = [encodeCallData(functionSelector, [argType], [argValue])];
  return Array.from(encode(['address[]', 'bytes[]'], [targets, data]));
};

/**
 * Converts a hex string to a Uint8Array
 *
 * @param {string} hexString The hex string to convert
 * @returns {Uint8Array} The resulting Uint8Array
 */
export const hexToUint8Array = (hexString) => {
  if (hexString.startsWith('0x')) {
    hexString = hexString.slice(2);
  }
  const length = hexString.length / 2;
  const uint8Array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    uint8Array[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return uint8Array;
};
