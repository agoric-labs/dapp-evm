/**
 * @file utils/gmp.js GMP payload construction utilities
 */
import { hexlify, arrayify, concat } from '@ethersproject/bytes';
import { encode } from '@findeth/abi';
import sha3 from "js-sha3";

export const GMPMessageType = {
  MESSAGE_ONLY: 1,
  MESSAGE_WITH_TOKEN: 2,
  TOKEN_ONLY: 3,
};
harden(GMPMessageType);

export const gmpAddresses = {
  AXELAR_GMP:
    "axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5",
  AXELAR_GAS: "axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd",
  OSMOSIS_RECEIVER: "osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj",
};

const uint8ArrayToHex = (uint8Array) => {
  return `0x${Array.from(uint8Array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
};

export const encodeCallData = (functionSignature, paramTypes, params) => {
  const functionHash = sha3.keccak256.digest(functionSignature);

  return uint8ArrayToHex(
    Uint8Array.from([
      ...Uint8Array.from(functionHash.slice(0, 4)),
      ...encode(paramTypes, params),
    ])
  );
};


/**
 * Builds a GMP payload for contract invocation
 *
 * @param {object} params Contract invocation parameters
 * @param {number} params.type GMP message type
 * @param {string} params.evmContractAddress Target contract address
 * @param {string} params.functionSelector Function selector (4 bytes)
 * @param {string} params.encodedArgs ABI encoded arguments
 * @param {number} params.deadline
 * @param {number} params.nonce
 * @returns {number[] | null} Encoded payload as number array, or null for a
 *   pure token transfer
 */
export const buildGMPPayload = ({
  type,
  evmContractAddress,
  functionSelector,
  encodedArgs,
  deadline,
  nonce,
}) => {
  if (type === GMPMessageType.TOKEN_ONLY) {
    return null;
  }

  const LOGIC_CALL_MSG_ID = 0;

  const payload = encode(
    ['uint256', 'address', 'uint256', 'uint256', 'bytes'],
    [
      LOGIC_CALL_MSG_ID,
      evmContractAddress,
      nonce,
      deadline,
      hexlify(concat([functionSelector, encodedArgs])),
    ]
  );

  return Array.from(arrayify(payload));
};
harden(buildGMPPayload);
