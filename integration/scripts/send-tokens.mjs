#!/usr/bin/env node
// @ts-check
import './lockdown.mjs';
import { processWalletOffer } from './utils.mjs';
import { makeVstorageKit, makeAgoricNames } from '@agoric/client-utils';

const LOCAL_CONFIG = {
  rpcAddrs: ['http://localhost:26657'],
  chainName: 'agoriclocal',
};

const vstorageKit = makeVstorageKit({ fetch }, LOCAL_CONFIG);

export const prepareOffer = async ({
  instanceName,
  source,
  invitationMakerName,
  brandName,
  amount,
  offerArgs,
  emptyProposal = false,
}) => {
  if (!vstorageKit) throw new Error('vstorageKit is required');
  if (!instanceName) throw new Error('instanceName is required');
  if (!source) throw new Error('source is required');

  const { brand } = await makeAgoricNames(
    vstorageKit.fromBoard,
    vstorageKit.vstorage,
  );
  console.log('wwwwww', brand[brandName]);
  const offerId = `offer-${Date.now()}`;

  const invitationSpec = {
    source,
    instancePath: [instanceName],
    callPipe: [[invitationMakerName]],
  };

  const proposal =
    emptyProposal || !amount || !brandName
      ? {}
      : {
          give: {
            [brandName]: {
              brand: brand[brandName],
              value: amount,
            },
          },
        };

  const body = {
    method: 'executeOffer',
    offer: {
      id: offerId,
      invitationSpec,
      offerArgs,
      proposal,
    },
  };

  // @ts-ignore
  return vstorageKit.marshaller.toCapData(harden(body));
};

const CONTAINER = 'agoric';
const OFFER_FILE = 'offer.json';
const CONTAINER_PATH = `/usr/src/${OFFER_FILE}`;
const FROM_ADDRESS = 'agoric1rwwley550k9mmk6uq6mm6z4udrg8kyuyvfszjk';

const offer = await prepareOffer({
  invitationMakerName: 'sendUSDC',
  instanceName: 'axelarGmp',
  offerArgs: harden({
    chainName: 'ethereum',
    destAddr: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
  }),
  source: 'agoricContract',
  brandName: 'NUSDC',
  amount: 2000000n,
});

await processWalletOffer({
  offer,
  OFFER_FILE,
  CONTAINER,
  CONTAINER_PATH,
  FROM_ADDRESS,
});
