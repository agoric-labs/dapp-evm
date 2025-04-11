import { makeVstorageKit, makeAgoricNames } from '@agoric/client-utils';

const LOCAL_CONFIG = {
  rpcAddrs: ['http://localhost/agoric-rpc'],
  chainName: 'agoriclocal',
};

const vstorageKit = makeVstorageKit({ fetch }, LOCAL_CONFIG);

export const prepareOffer = async ({
  invitationMakerName,
  instanceName,
  brandName,
  amount,
  source,
  invitationArgs,
  emptyProposal,
  previousOffer,
}) => {
  const { brand, instance } = await makeAgoricNames(
    vstorageKit.fromBoard,
    vstorageKit.vstorage
  );
  const id = Date.now();
  const body = {
    id,
    method: 'executeOffer',
    offer: {
      id: Date.now(),
      invitationSpec: {
        invitationMakerName,
        source,
        instance: instance[instanceName],
        ...(previousOffer && { previousOffer }),
        ...(invitationArgs && { invitationArgs }),
      },
      proposal: emptyProposal
        ? {}
        : {
            give: {
              [brandName]: { brand: brand[brandName], value: amount },
            },
          },
    },
  };

  return {
    id,
    offer: JSON.stringify(vstorageKit.marshaller.toCapData(harden(body))),
  };
};
