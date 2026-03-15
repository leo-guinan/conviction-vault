'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
} from '@solana/spl-token';
import { PLATFORM_WALLET } from '@/lib/wallet';
import { stake } from '@/lib/api';

interface TokenOption {
  symbol: string;
  mint: string;
  decimals: number;
}

const SUPPORTED_TOKENS: TokenOption[] = [
  { symbol: 'SOL', mint: 'native', decimals: 9 },
  { symbol: 'TOWEL', mint: 'Ak9ptp86tfJMrKwBwoe49pNkHxPjZk8GRQxZKB78pump', decimals: 6 },
  { symbol: 'METATOWEL', mint: 'CtsDk7Mo1wwhxhQp6zqB2oHEFXPEHhgjTBE8VvcUpump', decimals: 6 },
  { symbol: 'MARVIN', mint: '91gCUo2EY9sXNCTioG2AbCCTyraNn9zXvX5HF9qnpump', decimals: 6 },
];

type StakeStep = 'input' | 'pending' | 'success' | 'error';

interface StakeModalProps {
  vaultId: string;
  vaultName: string;
  onClose: () => void;
  onStaked: () => void;
}

export default function StakeModal({ vaultId, vaultName, onClose, onStaked }: StakeModalProps) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();

  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [step, setStep] = useState<StakeStep>('input');
  const [txSignature, setTxSignature] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      if (selectedToken.mint === 'native') {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } else {
        const mintPubkey = new PublicKey(selectedToken.mint);
        const ata = await getAssociatedTokenAddress(mintPubkey, publicKey);
        try {
          const account = await getAccount(connection, ata);
          setBalance(Number(account.amount) / 10 ** selectedToken.decimals);
        } catch {
          setBalance(0);
        }
      }
    } catch {
      setBalance(null);
    }
  }, [publicKey, selectedToken, connection]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  async function handleStake() {
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Enter a valid amount.');
      setStep('error');
      return;
    }

    if (balance !== null && numAmount > balance) {
      setErrorMsg(`Insufficient ${selectedToken.symbol} balance. You have ${balance.toFixed(4)}.`);
      setStep('error');
      return;
    }

    setStep('pending');
    setErrorMsg('');

    try {
      const platformPubkey = new PublicKey(PLATFORM_WALLET);
      const transaction = new Transaction();

      if (selectedToken.mint === 'native') {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: platformPubkey,
            lamports: Math.round(numAmount * LAMPORTS_PER_SOL),
          })
        );
      } else {
        const mintPubkey = new PublicKey(selectedToken.mint);
        const sourceAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
        const destAta = await getAssociatedTokenAddress(mintPubkey, platformPubkey);
        const rawAmount = BigInt(Math.round(numAmount * 10 ** selectedToken.decimals));

        transaction.add(
          createTransferInstruction(sourceAta, destAta, publicKey, rawAmount)
        );
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      // Record stake in backend
      await stake({
        vault_id: vaultId,
        staker_address: publicKey.toString(),
        token_mint: selectedToken.symbol,
        token_amount: numAmount,
      });

      setTxSignature(signature);
      setStep('success');
      onStaked();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      setErrorMsg(msg);
      setStep('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Stake in {vaultName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {step === 'input' && (
          <div className="space-y-4">
            {!connected && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-400 text-sm">
                Connect your wallet to stake.
                <button onClick={() => setVisible(true)} className="underline ml-1">Connect</button>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 block mb-1">Token</label>
              <select
                value={selectedToken.symbol}
                onChange={(e) => {
                  const t = SUPPORTED_TOKENS.find((t) => t.symbol === e.target.value)!;
                  setSelectedToken(t);
                }}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                {SUPPORTED_TOKENS.map((t) => (
                  <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              {balance !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  Balance: {balance.toFixed(4)} {selectedToken.symbol}
                  <button
                    onClick={() => setAmount(balance.toString())}
                    className="text-indigo-400 ml-2 hover:underline"
                  >
                    Max
                  </button>
                </p>
              )}
            </div>

            <button
              onClick={handleStake}
              disabled={!connected}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Stake {selectedToken.symbol}
            </button>
          </div>
        )}

        {step === 'pending' && (
          <div className="text-center py-6">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white font-medium mb-1">Waiting for confirmation...</p>
            <p className="text-gray-400 text-sm">Please approve the transaction in your wallet.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-medium mb-2">Stake successful!</p>
            <a
              href={`https://solscan.io/tx/${txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline text-sm break-all"
            >
              View on Solscan: {txSignature.slice(0, 8)}...{txSignature.slice(-8)}
            </a>
            <button
              onClick={onClose}
              className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="py-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
              {errorMsg}
            </div>
            <button
              onClick={() => setStep('input')}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
