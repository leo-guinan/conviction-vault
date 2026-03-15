'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export default function WalletConnect() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    const addr = publicKey.toString();
    const short = addr.slice(0, 4) + '...' + addr.slice(-4);
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-green-400 font-mono bg-green-400/10 px-3 py-1.5 rounded-lg">
          {short}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
    >
      Connect Wallet
    </button>
  );
}
