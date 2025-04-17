// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifest, startAxelarGmp } from './start-axelar-gmp.js';
import { chainInfo, assetInfo } from '../info.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) =>
  harden({
    sourceSpec: './start-axelar-gmp.js',
    getManifestCall: [
      getManifest.name,
      {
        installationRef: publishRef(install('../axelar-gmp.contract.js')),
        options,
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const parseChainInfo = () => {
    if (typeof chainInfo !== 'string') return undefined;
    return JSON.parse(chainInfo);
  };
  const parseAssetInfo = () => {
    if (typeof assetInfo !== 'string') return undefined;
    return JSON.parse(assetInfo);
  };
  const opts = harden({
    chainInfo: parseChainInfo(),
    assetInfo: parseAssetInfo(),
  });

  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval(startAxelarGmp.name, (utils) =>
    defaultProposalBuilder(utils, opts),
  );
};
