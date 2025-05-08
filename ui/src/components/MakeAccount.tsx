import { showError, showSuccess } from '../Utils';
import { TOAST_DURATION } from '../config';
import { useAppStore } from '../state';
import { toast } from 'react-toastify';
import { ContractCall, OfferArgs } from 'contract/types';
import './MakeAccount.css';

export const MakeAccount = () => {
  const { wallet, contractInstance, brands, currentOffers } =
    useAppStore.getState();
  const BLD = {
    brandKey: 'BLD',
    decimals: 6,
  };

  const makeOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    let toastId: string | number | null = null;

    try {
      if (!contractInstance) throw new Error('No contract instance');
      if (!brands) throw new Error('Brands not initialized');
      if (!wallet) throw new Error('Wallet not connected');

      const requiredBrand = brands[BLD.brandKey];
      const amountValue = BigInt(8000);

      const give = {
        [BLD.brandKey]: {
          brand: requiredBrand,
          value: amountValue,
        },
      };

      await new Promise<void>((resolve, reject) => {
        wallet.makeOffer(
          {
            source: 'contract',
            instance: contractInstance,
            publicInvitationMaker: 'createAndMonitorLCA',
          },
          { give },
          {},
          (update: { status: string; data?: unknown }) => {
            switch (update.status) {
              case 'error':
                console.error('Error:', update);
                reject(new Error(`Offer error: ${update.data}`));
                break;
              case 'accepted':
                toast.success('Offer accepted!');
                resolve();
                break;
              case 'refunded':
                reject(new Error('Offer was rejected'));
                break;
            }
          },
        );
      });

      showSuccess({
        content: 'Transaction Submitted Successfully',
        duration: TOAST_DURATION.SUCCESS,
      });
    } catch (error) {
      showError({
        content: error instanceof Error ? error.message : String(error),
        duration: TOAST_DURATION.ERROR,
      });
    } finally {
      if (toastId) toast.dismiss(toastId);
      useAppStore.setState({ loading: false });
    }
  };

  const sendGmpViaLCA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!latestInvitation) return;

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

    const args = {
      id: Date.now(),
      invitationSpec: {
        source: 'continuing',
        previousOffer: latestInvitation[0],
        invitationMakerName: 'makeEVMTransactionInvitation',
        invitationArgs: harden(['sendGmp', [sendGmpArgs]]),
      },
      offerArgs: {},
      proposal: { give },
    };
    let toastId: string | number | null = null;

    try {
      if (!wallet) throw new Error('Wallet not connected');

      await new Promise<void>((resolve, reject) => {
        wallet.makeOffer(
          args.invitationSpec,
          args.proposal,
          args.offerArgs,
          (update: { status: string; data?: unknown }) => {
            switch (update.status) {
              case 'error':
                reject(new Error(`Offer error: ${update.data}`));
                break;
              case 'accepted':
                toast.success('Offer accepted!');
                resolve();
                break;
              case 'refunded':
                reject(new Error('Offer was rejected'));
                break;
            }
          },
        );
      });

      showSuccess({
        content: 'Transaction Submitted Successfully',
        duration: TOAST_DURATION.SUCCESS,
      });
    } catch (error) {
      showError({
        content: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (toastId) toast.dismiss(toastId);
    }
  };

  const invitations = currentOffers?.offerToUsedInvitation.filter(
    (invitation) => {
      const value = invitation[1].value;

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

      <button className="invoke-button" onClick={makeOffer}>
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
