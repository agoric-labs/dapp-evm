import { makeVstorageKit, makeAgoricNames } from '@agoric/client-utils';

const LOCAL_CONFIG = {
  rpcAddrs: ['http://localhost/agoric-rpc'],
  chainName: 'agoriclocal',
};

const vstorageKit = makeVstorageKit({ fetch }, LOCAL_CONFIG);

export const prepareOffer = async ({
  invitationMakerName,
  publicInvitationMaker,
  instanceName,
  brandName,
  amount,
  source,
  invitationArgs,
  previousOffer,
  emptyProposal,
}) => {
  const { brand, instance } = await makeAgoricNames(
    vstorageKit.fromBoard,
    vstorageKit.vstorage,
  );

  const id = `make-account-${Date.now()}`;
  const body = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        ...(invitationMakerName && { invitationMakerName }),
        ...(publicInvitationMaker && { publicInvitationMaker }),
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

  return vstorageKit.marshaller.toCapData(harden(body));
};

export const wait = async (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const fetchFromVStorage = async (vStorageUrl) => {
  const response = await fetch(vStorageUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText}`,
    );
  }

  const { value } = await response.json();

  const rawValue = JSON.parse(value)?.values?.[0];
  if (!rawValue) {
    throw new Error('Missing expected data in vStorage response');
  }

  const bodyString = JSON.parse(rawValue).body;
  return JSON.parse(bodyString.slice(1));
};
