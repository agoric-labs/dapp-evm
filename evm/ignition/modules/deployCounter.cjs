// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require('@nomicfoundation/hardhat-ignition/modules');

module.exports = buildModule('CounterModule', (m) => {
  const initialCount = m.getParameter('initialCount', 0);
  const Counter = m.contract('Counter', [initialCount]);
  return { Counter };
});
