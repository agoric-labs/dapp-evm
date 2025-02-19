// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require('@nomicfoundation/hardhat-ignition/modules');
const { config } = require('dotenv');
config();

const { GATEWAY_CONTRACT, GAS_SERVICE_CONTRACT, AAVE_POOL } = process.env;
if (!GATEWAY_CONTRACT || !GAS_SERVICE_CONTRACT || !AAVE_POOL) {
  throw Error('GATEWAY_CONTRACT or GAS_SERVICE_CONTRACT or AAVE_POOL is not defined');
}

console.log(`GATEWAY_CONTRACT: ${GATEWAY_CONTRACT}`);
console.log(`GAS_SERVICE_CONTRACT: ${GAS_SERVICE_CONTRACT}`);
console.log(`AAVE_POOL: ${AAVE_POOL}`);

module.exports = buildModule('AaveTokenGatewayModule', (m) => {
  const gateway = m.getParameter('_gateway', GATEWAY_CONTRACT);
  const gasService = m.getParameter('_gasReceiver', GAS_SERVICE_CONTRACT);
  const aavePool = m.getParameter('_aavePool', AAVE_POOL);
  const DepositOnAaveTokenGateway = m.contract('DepositOnAaveTokenGateway', [gateway, gasService, aavePool]);
  return { DepositOnAaveTokenGateway };
});