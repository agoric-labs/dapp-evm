import React from 'react';
import { showError, showSuccess } from '../Utils';
import { TOAST_DURATION,
  BRAND_CONFIG, } from '../config';
import { useAppStore } from '../state';
import { toast } from 'react-toastify';

export const MakeAccount = () => {
  const { wallet, contractInstance, brands, currentOffers } = useAppStore.getState();

  const makeOffer = async () => {
    let toastId: string | number | null = null;

    try {
      if (!contractInstance) throw new Error('No contract instance');
      if (!brands) throw new Error('Brands not initialized');
      if (!wallet) throw new Error('Wallet not connected');

      const offerArgs = { chainName: 'osmosis' };

      const config = BRAND_CONFIG[2];

      const requiredBrand = brands[config.brandKey];
      const amountValue = BigInt(8001);

      const give = {
        [config.brandKey]: {
          brand: requiredBrand,
          value: amountValue,
        },
      };

      await new Promise<void>((resolve, reject) => {
        wallet.makeOffer(
          {
            source: 'contract',
            instance: contractInstance,
            publicInvitationMaker: 'makeAccountAndSendGMP',
          },
          { give },
          offerArgs,
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
          }
        );
      });

      showSuccess({
        content: 'Transaction Submitted Successfully',
        duration: TOAST_DURATION.SUCCESS,
      });
    } catch (error) {
      showError({ content: error.message, duration: TOAST_DURATION.ERROR });
    } finally {
      if (toastId) toast.dismiss(toastId);
      useAppStore.setState({ loading: false });
    }
  };

  const makeOfferToLCA = async () => {
    if (!latestInvitation) return;
    const args =  {
      id: Date.now(),
      invitationSpec: {
        source: 'continuing',
        previousOffer: latestInvitation[0],
        invitationMakerName: 'VoteOnParamChange',
      },
      offerArgs: {
        // instance,
        // params: changedParams,
        // deadline,
        // path: { paramPath: { key: { collateralBrand } } },
      },
      proposal: {},
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
          }
        );
      });

      showSuccess({
        content: 'Transaction Submitted Successfully',
        duration: TOAST_DURATION.SUCCESS,
      });
    } catch (error) {
      showError({ content: error.message, duration: TOAST_DURATION.ERROR });
    } finally {
      if (toastId) toast.dismiss(toastId);
      useAppStore.setState({ loading: false });
    }
  }

  const invitations = currentOffers?.offerToUsedInvitation.filter(invitation => invitation[1].value[0].instance === contractInstance);
  const latestInvitation = invitations?.sort((a, b) => b[0].localeCompare(a[0]))[0];

  return (
    <div className='dashboard-container'>
      <div className='dashboard'>
        <div className='transfer-form'>
          <button className='invoke-button' onClick={makeOffer}>
            Make Account
          </button>
          <button className='invoke-button' onClick={makeOfferToLCA} disabled={!latestInvitation}>
            Use Account {latestInvitation ? `(${latestInvitation[0]})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
