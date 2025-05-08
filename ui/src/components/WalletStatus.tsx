import { useAppStore } from '../state.js';
import './WalletStatus.css';

const WalletStatus = () => {
  const { wallet } = useAppStore.getState();

  if (!wallet?.address) {
    return null;
  }

  const abbreviatedAddress = `${wallet.address.slice(
    0,
    6,
  )}...${wallet.address.slice(-4)}`;

  return (
    <div className="wallet-status">
      <div className="connected-status">
        <div className="status-indicator connected" />
        <span className="status-text">Connected</span>
      </div>
      <div className="address-label">
        <span className="address">{abbreviatedAddress}</span>
        <span className="logo-placeholder">K</span>
      </div>
    </div>
  );
};

export default WalletStatus;
