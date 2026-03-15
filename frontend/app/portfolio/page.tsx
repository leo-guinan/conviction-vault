"use client";

import { useEffect, useState } from "react";
import { getWallet, connectWallet, disconnectWallet } from "@/lib/wallet";
import { fetchPositions, exitStake } from "@/lib/api";
import { formatLabel } from "@/lib/tokens";

export default function PortfolioPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);

  useEffect(() => {
    const w = getWallet();
    setWallet(w);
    if (w) loadPositions(w);
  }, []);

  async function loadPositions(address: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPositions(address);
      setPositions(Array.isArray(data) ? data : data.positions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    const addr = connectWallet();
    setWallet(addr);
    loadPositions(addr);
  }

  function handleDisconnect() {
    disconnectWallet();
    setWallet(null);
    setPositions([]);
  }

  async function handleExit(stakeId: string) {
    if (!wallet) return;
    setExitingId(stakeId);
    try {
      await exitStake({ stake_id: stakeId, staker_address: wallet });
      await loadPositions(wallet);
    } catch {
      alert("Exit failed. Please try again.");
    } finally {
      setExitingId(null);
    }
  }

  if (!wallet) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-white mb-4">Your Portfolio</h1>
        <p className="text-gray-400 mb-6">Connect your wallet to view your stakes and yield.</p>
        <button
          onClick={handleConnect}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const totalYield = positions.reduce(
    (sum: number, p: any) => sum + Number(p.yield_earned || 0),
    0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Your Portfolio</h1>
          <p className="text-gray-400 text-sm font-mono">{wallet}</p>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-1">Active Stakes</p>
          <p className="text-2xl font-mono font-semibold text-white">{positions.length}</p>
        </div>
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-1">Total Yield Earned</p>
          <p className="text-2xl font-mono font-semibold text-green-400">
            {totalYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 py-8">
          <div className="animate-spin w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
          Loading positions...
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 mb-4">
          {error}
        </div>
      )}

      {!loading && positions.length === 0 && (
        <p className="text-gray-500 py-8">No active positions. Stake into a vault to get started.</p>
      )}

      {/* Positions Table */}
      {positions.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-3 px-4 font-medium">Vault</th>
                <th className="text-left py-3 px-4 font-medium">Token</th>
                <th className="text-right py-3 px-4 font-medium">Amount</th>
                <th className="text-right py-3 px-4 font-medium">Yield</th>
                <th className="text-right py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p: any) => (
                <tr key={p.id || p.stake_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-4 text-white">{p.vault_name || p.vault_id}</td>
                  <td className="py-3 px-4 text-gray-300">{formatLabel(p.token_mint)}</td>
                  <td className="py-3 px-4 text-right font-mono text-white">
                    {Number(p.token_amount || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-green-400">
                    {Number(p.yield_earned || 0).toFixed(4)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === "active"
                        ? "bg-green-400/10 text-green-400"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {p.status || "active"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {(p.status === "active" || !p.status) && (
                      <button
                        onClick={() => handleExit(p.id || p.stake_id)}
                        disabled={exitingId === (p.id || p.stake_id)}
                        className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {exitingId === (p.id || p.stake_id) ? "Exiting..." : "Exit"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
