"use client";

import { useState, useEffect } from "react";
import { getWallet, connectWallet, disconnectWallet } from "@/lib/wallet";

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setAddress(getWallet());
  }, []);

  function handleConnect() {
    setShowModal(true);
    setTimeout(() => {
      const addr = connectWallet();
      setAddress(addr);
      setShowModal(false);
    }, 1500);
  }

  function handleDisconnect() {
    disconnectWallet();
    setAddress(null);
  }

  return (
    <>
      {address ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-400 font-mono bg-green-400/10 px-3 py-1.5 rounded-lg">
            {address}
          </span>
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Connect Wallet
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white font-medium mb-2">
              Connecting to Solana wallet...
            </p>
            <p className="text-gray-400 text-sm">
              MVP: transactions require backend confirmation
            </p>
          </div>
        </div>
      )}
    </>
  );
}
