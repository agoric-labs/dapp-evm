import { handleOffer } from '../Utils';
import { useAppStore } from '../state';
import { ContractCall, OfferArgs } from 'contract/types';
import './MakeAccount.css';

export const MakeAccount = () => {
  const { contractInstance, currentOffers } = useAppStore.getState();
  const BLD = {
    brandKey: 'BLD',
    decimals: 6,
  };

  

  const makeAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    const { brands } = useAppStore.getState();
    if (!brands) throw new Error('Brands not initialized');
    const requiredBrand = brands[BLD.brandKey];
    const amountValue = BigInt(8000);

    const give = {
      [BLD.brandKey]: {
        brand: requiredBrand,
        value: amountValue,
      },
    };

    await handleOffer({
      toastMessage: 'Submitting transaction...',
      invitationSpec: {
        source: 'contract',
        instance: contractInstance,
        publicInvitationMaker: 'createAndMonitorLCA',
      },
      proposal: { give },
      offerArgs: {},
      onSuccessMessage: 'Offer accepted!',
    });
  };

  const sendGmpViaLCA = async (e: React.FormEvent) => {
    e.preventDefault();

    const { brands } = useAppStore.getState();

    const requiredBrand = brands?.[BLD.brandKey];
    const amountValue = BigInt(1000000);

    const give = {
      [BLD.brandKey]: {
        brand: requiredBrand,
        value: amountValue,
      },
    };

    const factoryContractAddress = '0xef8651dD30cF990A1e831224f2E0996023163A81';
    const contractInvocationData: Array<ContractCall> = [
      {
        functionSignature: 'createVendor(string)',
        args: ['ownerAddress'],
        target: factoryContractAddress,
      },
    ];

    const sendGmpArgs: OfferArgs = {
      destinationAddress: factoryContractAddress,
      type: 1,
      gasAmount: 20000,
      destinationEVMChain: 'Ethereum',
      contractInvocationData,
    };

    await handleOffer({
      toastMessage: 'Submitting GMP transaction...',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'TODO',
        invitationMakerName: 'makeEVMTransactionInvitation',
        invitationArgs: harden(['sendGmp', [sendGmpArgs]]),
      },
      proposal: { give },
      offerArgs: {},
      onSuccessMessage: 'Transaction Submitted Successfully',
    });
  };

  console.log(currentOffers)
  const invitations = currentOffers?.offerToUsedInvitation.filter(
    (invitation) => {
      const value = invitation[1].value;
console.log("invi", invitation)
      if (Array.isArray(value)) {
        // TODO: figure out why it works but gives a type error
        // @ts-expect-error
        return value[0]?.instance === contractInstance;
      }

      return false;
    },
  );
  const latestInvitation = invitations?.sort((a, b) =>
    b[0].localeCompare(a[0]),
  )[0];

  return (
    <form className="dark-form-container">
      <h2 className="dark-title">Make Account</h2>

      <button className="invoke-button" onClick={makeAccount}>
        Make Account
      </button>
      <button
        className="invoke-button"
        onClick={sendGmpViaLCA}
        disabled={!latestInvitation}
      >
        Use Account {latestInvitation ? `(${latestInvitation[0]})` : ''}
      </button>
    </form>
  );
};
