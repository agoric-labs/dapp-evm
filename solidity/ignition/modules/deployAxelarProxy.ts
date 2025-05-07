// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import dotenv from 'dotenv';

dotenv.config();

const { GATEWAY_CONTRACT, GAS_SERVICE_CONTRACT } = process.env;

if (!GATEWAY_CONTRACT || !GAS_SERVICE_CONTRACT) {
  throw new Error('GATEWAY_CONTRACT or GAS_SERVICE_CONTRACT is not defined');
}

console.log(`GATEWAY_CONTRACT: ${GATEWAY_CONTRACT}`);
console.log(`GAS_SERVICE_CONTRACT: ${GAS_SERVICE_CONTRACT}`);

export default buildModule('AxelarProxyModule', (m) => {
  const gateway = m.getParameter('gateway_', GATEWAY_CONTRACT);
  const gasService = m.getParameter('gasReceiver_', GAS_SERVICE_CONTRACT);
  const AxelarProxy = m.contract('AxelarProxy', [gateway, gasService]);
  return { AxelarProxy };
});
